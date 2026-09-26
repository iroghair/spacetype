import type { Content, Entry, Level, Segment } from "../content/types";
import { pick, randomInt } from "./random";

// Builds the text for one run of a level. Each segment in levels.json fills
// its share of the run's characters, in order: typically a drill of the new
// keys, then a mixed drill of all learned keys, then real words or sentences.

export interface RunnerOptions {
  /** Letters per drill group, e.g. "fjj". */
  drillGroup: [number, number];
  /** Letters per mixed group. */
  mixedGroup: [number, number];
  /** A words segment needs at least this many usable words, or it becomes a mixed drill. */
  minWords: number;
  /** Chance of picking a word that uses the level's new keys (when there are enough). */
  focusChance: number;
  /** Don't repeat any of the last N words. */
  recentWords: number;
}

type Random = () => number;
type Generator = () => string;

export function buildRunText(
  level: Level,
  content: Pick<Content, "words" | "sentences">,
  random: Random,
  options: RunnerOptions,
): string {
  const parts: string[] = [];
  for (const segment of level.segments) {
    const budget = Math.round(segment.share * level.runLength);
    const next = generatorFor(segment, level, content, random, options);
    let length = 0;
    // Add items until the segment's share is used up (always at least one).
    do {
      const item = next();
      parts.push(item);
      length += item.length + 1; // +1 for the space after it
    } while (length < budget);
  }
  return parts.join(" ");
}

// Picks the generator for a segment. If a segment can't be made with the
// available content it falls back: sentences → words → mixed → drill.
function generatorFor(
  segment: Segment,
  level: Level,
  content: Pick<Content, "words" | "sentences">,
  random: Random,
  options: RunnerOptions,
): Generator {
  switch (segment.type) {
    case "sentences":
      return (
        sentences(segment, level, content.sentences, random) ??
        generatorFor(
          { ...segment, type: "words" },
          level,
          content,
          random,
          options,
        )
      );
    case "words":
      return (
        words(segment, level, content.words, random, options) ??
        generatorFor(
          { ...segment, type: "mixed" },
          level,
          content,
          random,
          options,
        )
      );
    case "mixed":
      return (
        mixed(segment, level, random, options) ??
        generatorFor(
          { ...segment, type: "drill" },
          level,
          content,
          random,
          options,
        )
      );
    case "drill": {
      const drill = drillOf(
        letters(segment.keys ?? level.newKeys),
        random,
        options,
      );
      if (drill) return drill;
      // No new letters (e.g. a sentences-only level): drill all learned letters.
      const all = drillOf(letters(level.allKeys), random, options);
      if (!all) throw new Error(`Level ${level.id} has no letters to practise`);
      return all;
    }
  }
}

/** The distinct lowercase letters in a key string (no spaces or punctuation). */
function letters(keys: string): string[] {
  return [...new Set(Array.from(keys).filter((c) => /[a-z]/.test(c)))];
}

function drillOf(
  keys: string[],
  random: Random,
  options: RunnerOptions,
): Generator | undefined {
  if (keys.length === 0) return undefined;
  let previous = "";
  return () => {
    let group: string;
    // Avoid the same group twice in a row (possible unless there is only one key).
    do {
      const size = randomInt(random, ...options.drillGroup);
      group = Array.from({ length: size }, () => pick(random, keys)).join("");
    } while (group === previous && keys.length > 1);
    previous = group;
    return group;
  };
}

// Groups of all learned letters; each group contains at least one focus key.
function mixed(
  segment: Segment,
  level: Level,
  random: Random,
  options: RunnerOptions,
): Generator | undefined {
  const pool = letters(level.allKeys);
  const focus = letters(segment.keys ?? level.newKeys);
  if (pool.length < 2) return undefined;
  return () => {
    const size = randomInt(random, ...options.mixedGroup);
    const group = Array.from({ length: size }, () => pick(random, pool));
    if (focus.length > 0 && !group.some((c) => focus.includes(c))) {
      group[randomInt(random, 0, size - 1)] = pick(random, focus);
    }
    return group.join("");
  };
}

function words(
  segment: Segment,
  level: Level,
  all: readonly Entry[],
  random: Random,
  options: RunnerOptions,
): Generator | undefined {
  const pool = all.filter((w) => w.level <= level.id).map((w) => w.text);
  if (pool.length < options.minWords) return undefined;
  const focus = all.filter((w) => w.level === level.id).map((w) => w.text);
  const useFocus = focus.length >= 3;
  const recent: string[] = [];

  return () => {
    let word: string;
    let tries = 0;
    do {
      const from = useFocus && random() < options.focusChance ? focus : pool;
      word = pick(random, from);
      tries++;
    } while (recent.includes(word) && tries < 20);
    recent.push(word);
    if (recent.length > options.recentWords) recent.shift();

    if (segment.capitalize && random() < segment.capitalize) {
      word = word[0].toUpperCase() + word.slice(1);
    }
    if (segment.punctuation && random() < (segment.punctuationChance ?? 0)) {
      word += pick(random, Array.from(segment.punctuation));
    }
    return word;
  };
}

function sentences(
  segment: Segment,
  level: Level,
  all: readonly Entry[],
  random: Random,
): Generator | undefined {
  const pool = all
    .filter((s) => s.level <= level.id)
    .filter((s) => s.text.length >= (segment.minLength ?? 0))
    .filter((s) => s.text.length <= (segment.maxLength ?? Infinity))
    .map((s) => s.text);
  if (pool.length === 0) return undefined;
  const newKeys = Array.from(level.newKeys);
  const focus = segment.focusNew
    ? pool.filter((s) => newKeys.some((k) => s.includes(k)))
    : [];

  // Go through the sentences in a shuffled order, so none repeats until all were used.
  const source = focus.length > 0 ? focus : pool;
  let queue: string[] = [];
  return () => {
    if (queue.length === 0) queue = shuffle([...source], random);
    return queue.pop()!;
  };
}

function shuffle<T>(items: T[], random: Random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
