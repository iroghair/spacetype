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
      { type: "strokeCorrect", index: 0, char: "f" },
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
    ]);
    expect(engine.key("j", 300)[0]).toEqual({
      type: "strokeCorrect",
      index: 2,
      char: "j",
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
