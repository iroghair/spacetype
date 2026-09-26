// Shapes of the generated files in public/content/<lang>/ (see scripts/content.mjs).

export interface Segment {
  type: "drill" | "mixed" | "words" | "sentences";
  /** Share of the run's characters, 0–1. Shares of a level add up to 1. */
  share: number;
  /** drill/mixed: practise these keys instead of the level's new keys. */
  keys?: string;
  /** words: chance (0–1) that a word starts with a capital. */
  capitalize?: number;
  /** words: punctuation that may follow a word, e.g. ",." */
  punctuation?: string;
  /** words: chance (0–1) that a word is followed by punctuation. */
  punctuationChance?: number;
  /** sentences: only sentences at least / at most this long. */
  minLength?: number;
  maxLength?: number;
  /** sentences: prefer sentences that use the level's new keys. */
  focusNew?: boolean;
}

export interface Level {
  id: number;
  name: string;
  /** Keys introduced in this level. */
  newKeys: string;
  /** Every key learned up to and including this level. */
  allKeys: string;
  targetSpm: number;
  /** Characters in one run. */
  runLength: number;
  segments: Segment[];
}

export interface Entry {
  text: string;
  /** The first level whose keys cover this text. */
  level: number;
  difficulty: number;
}

export interface Content {
  levels: Level[];
  words: Entry[];
  sentences: Entry[];
}
