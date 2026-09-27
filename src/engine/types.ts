import type { ComboTier } from "./scoring";

// State of one character in the run.
//   pending: not typed yet
//   correct: typed correctly
//   wrong:   a different key was typed (see `typed`)
//   missed:  reached the laser before it was typed
export type CharState = "pending" | "correct" | "wrong" | "missed";

export interface CharInfo {
  readonly char: string;
  state: CharState;
  /** The key actually typed, only set when state is "wrong". */
  typed?: string;
}

export type GameEvent =
  | { type: "strokeCorrect"; index: number; char: string; points: number }
  | { type: "strokeWrong"; index: number; expected: string; typed: string }
  /** An untyped letter reached the laser. Counts as a miss. */
  | { type: "letterMissed"; index: number }
  /** A wrongly typed letter reached the laser (visual only; the miss was already counted). */
  | { type: "letterBurned"; index: number }
  /** The combo reached a new tier (1 = first tier). */
  | { type: "comboTier"; tier: number; multiplier: number }
  /** A wrong key or a miss ended a combo of this length. */
  | { type: "comboBroken"; combo: number }
  /** Every letter of the word from `start` to `end` (exclusive) was correct. */
  | { type: "flawlessWord"; start: number; end: number; bonus: number }
  /** Typing fast enough for long enough: points count extra until turboEnd. */
  | { type: "turboStart" }
  | { type: "turboEnd" }
  | { type: "levelComplete" };

export interface EngineOptions {
  /** Target strokes per minute; sets the base speed of the stream. */
  targetSpm: number;
  /** Distance (in character slots) from the laser to the first character at the start. */
  startSlots: number;
  /**
   * When the next character to type is further than this from the laser,
   * the stream speeds up to bring it closer (the child is typing ahead).
   */
  comfortSlots: number;
  /** How quickly the stream catches up, per second (higher = snappier). */
  catchUpRate: number;
  /** Points for each correct stroke, before the combo multiplier. */
  pointsPerStroke: number;
  comboTiers: readonly ComboTier[];
  /** Bonus for a word typed without mistakes, before the combo multiplier. */
  flawlessWordBonus: number;
  /** Rolling window for live SPM (used for turbo). */
  spmWindowMs: number;
  spmMinWindowMs: number;
  /** Turbo: live SPM ≥ ratio × target for holdMs → points × multiplier. */
  turbo: { ratio: number; holdMs: number; multiplier: number };
}

/** Summary of a finished run, for the results screen. */
export interface RunStats {
  score: number;
  bestCombo: number;
  correct: number;
  wrong: number;
  missed: number;
  /** 0–1 */
  accuracy: number;
  /** Correct strokes per minute over the whole run. */
  spm: number;
}
