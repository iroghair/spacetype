import type { CharInfo, EngineOptions, GameEvent } from "./types";

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
  started = false;
  completed = false;

  private scroll = 0;
  private lastTimeMs = 0;
  /** Characters before this index have already crossed the laser. */
  private burnIndex = 0;

  constructor(
    text: string,
    private readonly options: EngineOptions,
  ) {
    // Array.from splits by character, so it would also be correct for emoji.
    this.chars = Array.from(text, (char) => ({
      char,
      state: "pending" as const,
    }));
  }

  start(nowMs: number): void {
    this.started = true;
    this.lastTimeMs = nowMs;
    this.scroll = -this.options.startSlots;
  }

  /** Distance of character `index` from the laser, in slots. */
  distance(index: number): number {
    return index - this.scroll;
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
      } else if (info.state === "wrong") {
        events.push({ type: "letterBurned", index: this.burnIndex });
      }
      this.burnIndex++;
    }

    this.checkComplete(events);
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
      this.score += this.options.pointsPerStroke;
      events.push({ type: "strokeCorrect", index, char: key });
    } else {
      info.state = "wrong";
      info.typed = key;
      events.push({
        type: "strokeWrong",
        index,
        expected: info.char,
        typed: key,
      });
    }
    // Strokes are final (rule 2): every key consumes exactly one character.
    this.cursor++;

    this.checkComplete(events);
    return events;
  }

  private checkComplete(events: GameEvent[]): void {
    if (!this.completed && this.cursor >= this.chars.length) {
      this.completed = true;
      events.push({ type: "levelComplete" });
    }
  }
}
