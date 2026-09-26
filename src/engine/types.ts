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
  | { type: "strokeCorrect"; index: number; char: string }
  | { type: "strokeWrong"; index: number; expected: string; typed: string }
  /** An untyped letter reached the laser. Counts as a miss. */
  | { type: "letterMissed"; index: number }
  /** A wrongly typed letter reached the laser (visual only; the miss was already counted). */
  | { type: "letterBurned"; index: number }
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
  /** Points for each correct stroke. */
  pointsPerStroke: number;
}
