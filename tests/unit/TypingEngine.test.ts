import { describe, expect, it } from "vitest";
import { TypingEngine } from "../../src/engine/TypingEngine";
import type { EngineOptions } from "../../src/engine/types";

// 60 SPM = exactly one slot per second, which keeps the arithmetic readable.
const options: EngineOptions = {
  targetSpm: 60,
  startSlots: 5,
  comfortSlots: 5,
  catchUpRate: 4,
  pointsPerStroke: 10,
  comboTiers: [],
  flawlessWordBonus: 0,
};

function started(
  text: string,
  overrides: Partial<EngineOptions> = {},
): TypingEngine {
  const engine = new TypingEngine(text, { ...options, ...overrides });
  engine.start(0);
  return engine;
}

describe("before start", () => {
  it("ignores keys and time", () => {
    const engine = new TypingEngine("fj", options);
    expect(engine.key("f", 0)).toEqual([]);
    expect(engine.update(10_000)).toEqual([]);
    expect(engine.cursor).toBe(0);
  });
});

describe("rule 1: characters are typed strictly in order", () => {
  it("starts with the cursor on the first character, the one nearest the laser", () => {
    const engine = started("fj");
    expect(engine.cursor).toBe(0);
    expect(engine.distance(0)).toBe(5);
    expect(engine.distance(1)).toBe(6);
  });
});

describe("rule 2: every keystroke consumes exactly one character", () => {
  it("marks a correct stroke, scores it and moves on", () => {
    const engine = started("fj");
    expect(engine.key("f", 100)).toEqual([
      { type: "strokeCorrect", index: 0, char: "f", points: 10 },
    ]);
    expect(engine.chars[0].state).toBe("correct");
    expect(engine.cursor).toBe(1);
    expect(engine.score).toBe(10);
  });

  it("marks a wrong stroke with the typed key, gives no points and moves on", () => {
    const engine = started("fj");
    expect(engine.key("k", 100)).toEqual([
      { type: "strokeWrong", index: 0, expected: "f", typed: "k" },
    ]);
    expect(engine.chars[0]).toEqual({ char: "f", state: "wrong", typed: "k" });
    expect(engine.cursor).toBe(1);
    expect(engine.score).toBe(0);
  });

  it("is case-sensitive", () => {
    const engine = started("F");
    engine.key("f", 100);
    expect(engine.chars[0].state).toBe("wrong");
  });

  it("requires spaces to be typed too (rule 4)", () => {
    const engine = started("f j");
    engine.key("f", 100);
    expect(engine.key("j", 200)).toEqual([
      { type: "strokeWrong", index: 1, expected: " ", typed: "j" },
      { type: "comboBroken", combo: 1 },
    ]);
    expect(engine.key("j", 300)[0]).toEqual({
      type: "strokeCorrect",
      index: 2,
      char: "j",
      points: 10,
    });
  });

  it("records a space typed in place of a letter", () => {
    const engine = started("f");
    engine.key(" ", 100);
    expect(engine.chars[0]).toEqual({ char: "f", state: "wrong", typed: " " });
  });

  it("lets a wrong letter keep flying and burn at the laser without a second miss", () => {
    const engine = started("fj", { comfortSlots: 100 });
    engine.key("k", 100);
    // Character 0 reaches the laser after 5 s.
    const events = engine.update(5_000);
    expect(events).toContainEqual({ type: "letterBurned", index: 0 });
    expect(engine.chars[0].state).toBe("wrong");
    expect(events.some((e) => e.type === "letterMissed")).toBe(false);
  });

  it("does not burn a correct letter", () => {
    const engine = started("fj", { comfortSlots: 100 });
    engine.key("f", 100);
    expect(engine.update(5_000)).toEqual([]);
  });
});

describe("rule 3: untyped letters burn at the laser", () => {
  it("marks the letter missed and skips the cursor past it", () => {
    const engine = started("fj", { comfortSlots: 100 });
    expect(engine.update(4_900)).toEqual([]);
    expect(engine.update(5_000)).toEqual([{ type: "letterMissed", index: 0 }]);
    expect(engine.chars[0].state).toBe("missed");
    expect(engine.cursor).toBe(1);
  });

  it("burns several letters in one long frame", () => {
    const engine = started("fjf", { comfortSlots: 100 });
    const events = engine.update(6_000);
    expect(events).toEqual([
      { type: "letterMissed", index: 0 },
      { type: "letterMissed", index: 1 },
    ]);
    expect(engine.cursor).toBe(2);
  });

  it("burns a letter before applying a key pressed after it reached the laser", () => {
    const engine = started("fjf", { comfortSlots: 100 });
    const events = engine.key("f", 5_000);
    expect(events).toEqual([
      { type: "letterMissed", index: 0 },
      { type: "strokeWrong", index: 1, expected: "j", typed: "f" },
    ]);
  });
});

describe("rule 5: stream speed", () => {
  it("moves at the target pace: one slot per stroke-time", () => {
    const engine = started("fjfjfjfjfj", { comfortSlots: 100 });
    engine.update(2_000);
    expect(engine.distance(0)).toBeCloseTo(3);
  });

  it("scales with target SPM", () => {
    const engine = started("fjfjfjfjfj", { targetSpm: 30, comfortSlots: 100 });
    engine.update(2_000);
    expect(engine.distance(0)).toBeCloseTo(4);
  });

  it("keeps letters clear of the laser when typing at target pace", () => {
    const text = "fj".repeat(20);
    const engine = started(text);
    for (let i = 0; i < text.length; i++) {
      const events = engine.key(text[i], (i + 1) * 1_000);
      expect(events.some((e) => e.type === "letterMissed")).toBe(false);
    }
    expect(engine.chars.every((c) => c.state === "correct")).toBe(true);
  });

  it("speeds up when the child types ahead, bringing the next letter back towards the comfort distance", () => {
    const engine = started("fjfjfjfjfjfjfjfjfjfj");
    // Type 6 letters instantly: the next letter is now 6 slots further away.
    for (const k of "fjfjfj") engine.key(k, 0);
    expect(engine.distance(engine.cursor)).toBeCloseTo(11);
    engine.update(2_000);
    // Without catch-up it would be at 9; with catch-up it is close to the comfort distance.
    expect(engine.distance(engine.cursor)).toBeLessThan(6);
    expect(engine.distance(engine.cursor)).toBeGreaterThanOrEqual(3);
  });

  it("never pulls the next letter closer than the comfort distance in one step", () => {
    const engine = started("fjfjfjfjfjfjfjfjfjfj", {
      targetSpm: 0.0001,
      catchUpRate: 1000,
    });
    for (const k of "fjfjfj") engine.key(k, 0);
    engine.update(10_000);
    expect(engine.distance(engine.cursor)).toBeGreaterThanOrEqual(5 - 0.01);
  });
});

describe("level end", () => {
  it("completes when the last character is typed", () => {
    const engine = started("fj");
    engine.key("f", 100);
    expect(engine.key("k", 200)).toEqual([
      { type: "strokeWrong", index: 1, expected: "j", typed: "k" },
      { type: "comboBroken", combo: 1 },
      { type: "levelComplete" },
    ]);
    expect(engine.completed).toBe(true);
  });

  it("completes when the last character burns", () => {
    const engine = started("f", { comfortSlots: 100 });
    expect(engine.update(5_000)).toEqual([
      { type: "letterMissed", index: 0 },
      { type: "levelComplete" },
    ]);
  });

  it("ignores keys after completion but keeps burning wrong letters", () => {
    const engine = started("fj", { comfortSlots: 100 });
    engine.key("k", 0);
    engine.key("k", 0);
    expect(engine.key("f", 100)).toEqual([]);
    expect(engine.update(6_000)).toEqual([
      { type: "letterBurned", index: 0 },
      { type: "letterBurned", index: 1 },
    ]);
  });

  it("emits levelComplete only once", () => {
    const engine = started("f");
    engine.key("f", 0);
    expect(engine.update(10_000)).toEqual([]);
  });
});

describe("scoring", () => {
  const tiers = [
    { combo: 3, multiplier: 2 },
    { combo: 5, multiplier: 3 },
  ];

  it("counts a combo of consecutive correct strokes", () => {
    const engine = started("fjfjfj");
    for (const k of "fjf") engine.key(k, 0);
    expect(engine.combo).toBe(3);
  });

  it("resets the combo on a wrong key and remembers the best combo", () => {
    const engine = started("fjfjfj");
    for (const k of "fjfk") engine.key(k, 0);
    expect(engine.combo).toBe(0);
    expect(engine.bestCombo).toBe(3);
  });

  it("resets the combo on a miss", () => {
    const engine = started("fjfjfj", { comfortSlots: 100 });
    engine.key("f", 0);
    const events = engine.update(6_000); // character 1 reaches the laser
    expect(events).toContainEqual({ type: "comboBroken", combo: 1 });
    expect(engine.combo).toBe(0);
  });

  it("announces each tier once and multiplies the points", () => {
    const engine = started("fjfjfjfj", { comboTiers: tiers });
    const all = [..."fjfjfj"].flatMap((k) => engine.key(k, 0));
    expect(all.filter((e) => e.type === "comboTier")).toEqual([
      { type: "comboTier", tier: 1, multiplier: 2 },
      { type: "comboTier", tier: 2, multiplier: 3 },
    ]);
    // strokes 1-2: x1, 3-4: x2, 5-6: x3  →  10+10+20+20+30+30
    expect(engine.score).toBe(120);
  });

  it("gives a bonus for a word without mistakes, times the multiplier", () => {
    const engine = started("fj jf", { flawlessWordBonus: 25 });
    engine.key("f", 0);
    expect(engine.key("j", 0)).toContainEqual({
      type: "flawlessWord",
      start: 0,
      end: 2,
      bonus: 25,
    });
    engine.key(" ", 0);
    engine.key("j", 0);
    expect(engine.key("f", 0)).toContainEqual({
      type: "flawlessWord",
      start: 3,
      end: 5,
      bonus: 25,
    });
  });

  it("gives no word bonus after a mistake in the word, or for one-letter words", () => {
    const engine = started("fj f", { flawlessWordBonus: 25 });
    const all = [..."fk f"].flatMap((k) => engine.key(k, 0));
    expect(all.some((e) => e.type === "flawlessWord")).toBe(false);
  });

  it("reports accuracy and whole-run SPM", () => {
    const engine = started("fjfj", { startSlots: 1000, comfortSlots: 1000 });
    engine.key("f", 15_000);
    engine.key("k", 30_000);
    engine.key("f", 45_000);
    engine.key("j", 60_000);
    const stats = engine.stats();
    expect(stats.accuracy).toBe(0.75);
    expect(stats.spm).toBe(3); // 3 correct in 1 minute
    expect(stats).toMatchObject({ correct: 3, wrong: 1, missed: 0 });
  });

  it("measures live SPM over a rolling window", () => {
    const engine = started("fjfjfjfjfj");
    for (let i = 0; i < 10; i++) engine.key("fjfjfjfjfj"[i], i * 1_000);
    // 10 strokes in the last 10 s (window 20 s, but only 10 s since start) → 60 SPM
    expect(engine.liveSpm(10_000, 20_000, 5_000)).toBeCloseTo(60);
  });
});
