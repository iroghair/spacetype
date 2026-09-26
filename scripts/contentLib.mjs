// Pure helpers for the content pipeline (scripts/content.mjs). No file access
// here, so everything can be unit-tested (tests/unit/contentLib.test.ts).
//
// Written in plain JavaScript so Node can run it directly; the JSDoc comments
// give TypeScript enough type information to check it.

/**
 * @typedef {{ type: "drill" | "mixed" | "words" | "sentences", share: number,
 *   keys?: string, capitalize?: number, punctuation?: string, punctuationChance?: number,
 *   minLength?: number, maxLength?: number, focusNew?: boolean }} Segment
 * @typedef {{ id: number, name: string, newKeys: string, targetSpm: number,
 *   runLength: number, segments: Segment[] }} LevelSource
 * @typedef {LevelSource & { allKeys: string }} Level
 * @typedef {{ text: string, level: number, difficulty: number }} Entry
 * @typedef {{ line: number, message: string }} Problem
 */

export const HOME_ROW = "asdfghjkl";
const SEGMENT_TYPES = ["drill", "mixed", "words", "sentences"];
const WORD_PATTERN = /^[a-z]+$/;
const SENTENCE_PATTERN = /^[A-Za-z ,.?!:-]+$/;

/**
 * Split a text file into its non-empty lines, remembering line numbers.
 * Lines starting with # are comments.
 * @param {string} text
 * @returns {{ line: number, text: string }[]}
 */
export function parseLines(text) {
  return text
    .split(/\r?\n/)
    .map((raw, i) => ({ line: i + 1, text: raw.trim() }))
    .filter((l) => l.text !== "" && !l.text.startsWith("#"));
}

/**
 * Difficulty score of a word or sentence: higher is harder.
 *
 *   length                           every character is one more stroke
 * + 0.5 × number of distinct keys    more different keys to find
 * + 4   × share of letters off the home row
 * + 1.5 × number of capitals         each needs Shift
 * + 1.5 × number of punctuation marks
 *
 * Rounded to 2 decimals.
 * @param {string} text
 */
export function difficulty(text) {
  const chars = Array.from(text);
  const letters = chars.filter((c) => /[a-z]/i.test(c));
  const distinct = new Set(chars.map((c) => c.toLowerCase())).size;
  const offHome = letters.filter(
    (c) => !HOME_ROW.includes(c.toLowerCase()),
  ).length;
  const offHomeShare = letters.length === 0 ? 0 : offHome / letters.length;
  const capitals = chars.filter((c) => /[A-Z]/.test(c)).length;
  const punctuation = chars.filter((c) => /[,.?!:-]/.test(c)).length;
  const score =
    chars.length +
    0.5 * distinct +
    4 * offHomeShare +
    1.5 * capitals +
    1.5 * punctuation;
  return Math.round(score * 100) / 100;
}

/**
 * Add `allKeys` to each level: every key learned up to and including it.
 * @param {LevelSource[]} levels
 * @returns {Level[]}
 */
export function withAllKeys(levels) {
  let learned = "";
  return levels.map((level) => {
    for (const key of level.newKeys) if (!learned.includes(key)) learned += key;
    return { ...level, allKeys: learned };
  });
}

/**
 * The earliest level whose keys cover every character of `text`, or undefined.
 * @param {string} text
 * @param {Level[]} levels
 */
export function levelFor(text, levels) {
  const found = levels.find((level) =>
    Array.from(text).every((c) => level.allKeys.includes(c)),
  );
  return found?.id;
}

/**
 * Check levels.json. Returns a list of problems (empty when fine).
 * @param {unknown} data
 * @returns {string[]}
 */
export function validateLevels(data) {
  if (!Array.isArray(data) || data.length === 0)
    return ["levels.json must be a non-empty list"];
  /** @type {string[]} */
  const problems = [];
  data.forEach((level, i) => {
    const where = `level ${i + 1}`;
    if (level.id !== i + 1) problems.push(`${where}: id should be ${i + 1}`);
    if (typeof level.name !== "string" || level.name === "")
      problems.push(`${where}: missing name`);
    if (typeof level.newKeys !== "string")
      problems.push(`${where}: newKeys must be a string`);
    for (const field of ["targetSpm", "runLength"]) {
      if (!(level[field] > 0))
        problems.push(`${where}: ${field} must be a positive number`);
    }
    if (!Array.isArray(level.segments) || level.segments.length === 0) {
      problems.push(`${where}: needs at least one segment`);
      return;
    }
    let total = 0;
    for (const segment of level.segments) {
      if (!SEGMENT_TYPES.includes(segment.type)) {
        problems.push(`${where}: unknown segment type "${segment.type}"`);
      }
      total += segment.share;
    }
    if (Math.abs(total - 1) > 0.01)
      problems.push(`${where}: segment shares add up to ${total}, not 1`);
  });
  return problems;
}

/**
 * Validate lines of words.txt or sentences.txt and turn them into sorted entries.
 * @param {{ line: number, text: string }[]} lines
 * @param {"word" | "sentence"} kind
 * @param {Level[]} levels
 * @returns {{ entries: Entry[], problems: Problem[] }}
 */
export function buildEntries(lines, kind, levels) {
  const pattern = kind === "word" ? WORD_PATTERN : SENTENCE_PATTERN;
  /** @type {Problem[]} */
  const problems = [];
  /** @type {Map<string, number>} */
  const seen = new Map();
  /** @type {Entry[]} */
  const entries = [];

  for (const { line, text } of lines) {
    if (!pattern.test(text)) {
      problems.push({
        line,
        message:
          kind === "word"
            ? `"${text}": only lowercase a-z allowed`
            : `"${text}": only letters, spaces and , . ? ! : - allowed`,
      });
      continue;
    }
    if (text.includes("  ")) {
      problems.push({ line, message: `"${text}": double space` });
      continue;
    }
    const key = text.toLowerCase();
    const earlier = seen.get(key);
    if (earlier !== undefined) {
      problems.push({
        line,
        message: `"${text}": duplicate of line ${earlier}`,
      });
      continue;
    }
    seen.set(key, line);
    const level = levelFor(text, levels);
    if (level === undefined) {
      problems.push({
        line,
        message: `"${text}": uses a key that no level teaches`,
      });
      continue;
    }
    entries.push({ text, level, difficulty: difficulty(text) });
  }

  entries.sort(
    (a, b) =>
      a.level - b.level ||
      a.difficulty - b.difficulty ||
      a.text.localeCompare(b.text),
  );
  return { entries, problems };
}
