import { describe, expect, it } from "vitest";
import {
  confusedKeys,
  multiplierFor,
  rollingSpm,
  starsFor,
  tierFor,
} from "../../src/engine/scoring";
import type { CharInfo } from "../../src/engine/types";

const tiers = [
  { combo: 10, multiplier: 2 },
  { combo: 25, multiplier: 3 },
  { combo: 50, multiplier: 4 },
  { combo: 100, multiplier: 5 },
];

describe("combo tiers", () => {
  it("maps combos to tiers and multipliers", () => {
    expect(
      [0, 9, 10, 24, 25, 50, 99, 100, 500].map((c) => tierFor(c, tiers)),
    ).toEqual([0, 0, 1, 1, 2, 3, 3, 4, 4]);
    expect([0, 9, 10, 25, 50, 100].map((c) => multiplierFor(c, tiers))).toEqual(
      [1, 1, 2, 3, 4, 5],
    );
  });
});

describe("rollingSpm", () => {
  it("counts strokes inside the window only", () => {
    const times = [0, 5_000, 25_000, 30_000];
    // at 40 s with a 20 s window: strokes at 25 s and 30 s → 2 per 20 s = 6 SPM
    expect(rollingSpm(times, 40_000, 0, 20_000, 5_000)).toBeCloseTo(6);
  });

  it("uses a minimum window at the very start", () => {
    // 2 strokes 1 s after start would be 120 SPM; the 5 s minimum makes it 24.
    expect(rollingSpm([500, 1_000], 1_000, 0, 20_000, 5_000)).toBeCloseTo(24);
  });
});

describe("starsFor", () => {
  const rules = {
    two: { accuracy: 0.85, spmRatio: 0.75 },
    three: { accuracy: 0.95, spmRatio: 1 },
  };
  it("gives 3 stars on target with high accuracy", () => {
    expect(starsFor(0.96, 60, 60, rules)).toBe(3);
  });
  it("gives 2 stars when a bit slower or less accurate", () => {
    expect(starsFor(0.9, 60, 60, rules)).toBe(2);
    expect(starsFor(0.99, 50, 60, rules)).toBe(2);
  });
  it("always gives at least 1 star", () => {
    expect(starsFor(0.3, 10, 60, rules)).toBe(1);
  });
});

describe("confusedKeys", () => {
  it("groups wrong strokes by expected and typed key, most frequent first", () => {
    const chars: CharInfo[] = [
      { char: "j", state: "wrong", typed: "k" },
      { char: "f", state: "wrong", typed: "d" },
      { char: "j", state: "wrong", typed: "k" },
      { char: "j", state: "correct" },
      { char: "a", state: "missed" },
    ];
    expect(confusedKeys(chars)).toEqual([
      { expected: "j", typed: "k", count: 2 },
      { expected: "f", typed: "d", count: 1 },
    ]);
  });
});
