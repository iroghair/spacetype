import { multiplierFor, rollingSpm, tierFor } from "./scoring";
import type { CharInfo, EngineOptions, GameEvent, RunStats } from "./types";

// The rules of one run (see PLAN.md, section 3). Pure logic: no Phaser, no DOM,
// no timers. The caller passes the current time (in milliseconds) to every method.
//
// Positions are measured in "slots": one slot is the space one character takes
// in the stream. Character i sits at `i - scroll` slots from the laser, so all
// characters move together as `scroll` grows. A distance of 0 means "at the laser".
export class TypingEngine {
  readonly chars: CharInfo[];
  /** Index of the next character to type. Equals chars.length when the run is over. */
  cursor = 0;
  score = 0;
  combo = 0;
  bestCombo = 0;
  started = false;
  completed = false;

  private scroll = 0;
  private lastTimeMs = 0;
  private startTimeMs = 0;
  private endTimeMs = 0;
  /** Characters before this index have already crossed the laser. */
  private burnIndex = 0;
  /** For each character, the index where its word starts. */
  private readonly wordStart: number[];
  /** Times of all correct strokes, for the SPM meter. */
  private readonly strokeTimes: number[] = [];

  constructor(
    text: string,
    private readonly options: EngineOptions,
  ) {
    // Array.from splits by character, so it would also be correct for emoji.
    this.chars = Array.from(text, (char) => ({
      char,
      state: "pending" as const,
    }));
    let start = 0;
    this.wordStart = this.chars.map((c, i) => {
      if (c.char === " ") start = i + 1;
      return start;
    });
  }

  start(nowMs: number): void {
    this.started = true;
    this.lastTimeMs = nowMs;
    this.startTimeMs = nowMs;
    this.scroll = -this.options.startSlots;
  }

  /** Distance of character `index` from the laser, in slots. */
  distance(index: number): number {
    return index - this.scroll;
  }

  /** Current score multiplier from the combo. */
  get multiplier(): number {
    return multiplierFor(this.combo, this.options.comboTiers);
  }

  /** Live strokes per minute over a rolling window (see scoring.rollingSpm). */
  liveSpm(nowMs: number, windowMs: number, minWindowMs: number): number {
    return rollingSpm(
      this.strokeTimes,
      nowMs,
      this.startTimeMs,
      windowMs,
      minWindowMs,
    );
  }

  /** Accuracy so far, 0–1 (1 before any stroke). */
  get accuracy(): number {
    let correct = 0;
    let done = 0;
    for (const c of this.chars) {
      if (c.state === "pending") continue;
      done++;
      if (c.state === "correct") correct++;
    }
    return done === 0 ? 1 : correct / done;
  }

  /** Summary for the results screen. Meaningful once the run is complete. */
  stats(): RunStats {
    const count = (state: CharInfo["state"]) =>
      this.chars.filter((c) => c.state === state).length;
    const correct = count("correct");
    const minutes = Math.max(1, this.endTimeMs - this.startTimeMs) / 60_000;
    return {
      score: this.score,
      bestCombo: this.bestCombo,
      correct,
      wrong: count("wrong"),
      missed: count("missed"),
      accuracy: this.accuracy,
      spm: correct / minutes,
    };
  }

  /** Move the stream forward to `nowMs` and burn anything that reached the laser. */
  update(nowMs: number): GameEvent[] {
    if (!this.started) return [];
    const events: GameEvent[] = [];
    const seconds = Math.max(0, nowMs - this.lastTimeMs) / 1000;
    this.lastTimeMs = nowMs;

    // Base speed: at the target pace, one character reaches the laser per stroke.
    this.scroll += (this.options.targetSpm / 60) * seconds;

    // Typing ahead (rule 5): if the next character is far from the laser, pull
    // the stream forward. The pull is proportional to how far ahead the child
    // is, which gives a smooth catch-up instead of a jump. Math.min stops a long
    // frame from overshooting.
    if (this.cursor < this.chars.length) {
      const excess = this.distance(this.cursor) - this.options.comfortSlots;
      if (excess > 0) {
        this.scroll += Math.min(
          excess,
          excess * this.options.catchUpRate * seconds,
        );
      }
    }

    // Burn everything that reached the laser (rule 3).
    while (
      this.burnIndex < this.chars.length &&
      this.distance(this.burnIndex) <= 0
    ) {
      const info = this.chars[this.burnIndex];
      if (info.state === "pending") {
        // Characters are typed in order, so a pending one here is always the cursor.
        info.state = "missed";
        this.cursor = this.burnIndex + 1;
        events.push({ type: "letterMissed", index: this.burnIndex });
        this.breakCombo(events);
      } else if (info.state === "wrong") {
        events.push({ type: "letterBurned", index: this.burnIndex });
      }
      this.burnIndex++;
    }

    this.checkComplete(events, nowMs);
    return events;
  }

  /** Handle one keystroke. `key` is the character produced (event.key). */
  key(key: string, nowMs: number): GameEvent[] {
    if (!this.started || this.completed) return [];
    // Catch up on time first, so a letter that burned just before the key
    // press is not typed "after the fact".
    const events = this.update(nowMs);
    if (this.cursor >= this.chars.length) return events;

    const index = this.cursor;
    const info = this.chars[index];
    if (key === info.char) {
      info.state = "correct";
      this.strokeTimes.push(nowMs);
      this.growCombo(events);
      const points = this.options.pointsPerStroke * this.multiplier;
      this.score += points;
      events.push({ type: "strokeCorrect", index, char: key, points });
      this.checkFlawlessWord(index, events);
    } else {
      info.state = "wrong";
      info.typed = key;
      events.push({
        type: "strokeWrong",
        index,
        expected: info.char,
        typed: key,
      });
      this.breakCombo(events);
    }
    // Strokes are final (rule 2): every key consumes exactly one character.
    this.cursor++;

    this.checkComplete(events, nowMs);
    return events;
  }

  private growCombo(events: GameEvent[]): void {
    const tiers = this.options.comboTiers;
    const before = tierFor(this.combo, tiers);
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const after = tierFor(this.combo, tiers);
    if (after > before) {
      events.push({
        type: "comboTier",
        tier: after,
        multiplier: tiers[after - 1].multiplier,
      });
    }
  }

  private breakCombo(events: GameEvent[]): void {
    if (this.combo > 0) events.push({ type: "comboBroken", combo: this.combo });
    this.combo = 0;
  }

  // Bonus when the last letter of a word (2+ letters) completes it without mistakes.
  private checkFlawlessWord(index: number, events: GameEvent[]): void {
    if (this.chars[index].char === " ") return;
    const next = this.chars[index + 1];
    if (next && next.char !== " ") return; // not the end of the word yet
    const start = this.wordStart[index];
    if (index - start + 1 < 2) return;
    for (let i = start; i <= index; i++) {
      if (this.chars[i].state !== "correct") return;
    }
    const bonus = this.options.flawlessWordBonus * this.multiplier;
    if (bonus <= 0) return;
    this.score += bonus;
    events.push({ type: "flawlessWord", start, end: index + 1, bonus });
  }

  private checkComplete(events: GameEvent[], nowMs: number): void {
    if (!this.completed && this.cursor >= this.chars.length) {
      this.completed = true;
      this.endTimeMs = nowMs;
      events.push({ type: "levelComplete" });
    }
  }
}
