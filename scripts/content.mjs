// Content pipeline: validates content/nl/ and writes sorted JSON to public/content/nl/.
//
//   content/nl/levels.json   → public/content/nl/levels.json    (adds allKeys per level)
//   content/nl/words.txt     → public/content/nl/words.json     (level + difficulty per word)
//   content/nl/sentences.txt → public/content/nl/sentences.json
//
// Stops with an error (and writes nothing) if any file has problems.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  buildEntries,
  parseLines,
  validateLevels,
  withAllKeys,
} from "./contentLib.mjs";

const srcDir = "content/nl";
const outDir = "public/content/nl";

const levelsSource = JSON.parse(readFileSync(`${srcDir}/levels.json`, "utf8"));
const levelProblems = validateLevels(levelsSource);
if (levelProblems.length > 0) {
  for (const p of levelProblems) console.error(`${srcDir}/levels.json: ${p}`);
  process.exit(1);
}
const levels = withAllKeys(levelsSource);

let failed = false;
/** @param {string} file @param {"word" | "sentence"} kind */
function build(file, kind) {
  const lines = parseLines(readFileSync(`${srcDir}/${file}`, "utf8"));
  const { entries, problems } = buildEntries(lines, kind, levels);
  for (const p of problems)
    console.error(`${srcDir}/${file}:${p.line}: ${p.message}`);
  if (problems.length > 0) failed = true;
  return entries;
}
const words = build("words.txt", "word");
const sentences = build("sentences.txt", "sentence");
if (failed) process.exit(1);

mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/levels.json`, JSON.stringify(levels, null, 1));
writeFileSync(`${outDir}/words.json`, JSON.stringify(words, null, 1));
writeFileSync(`${outDir}/sentences.json`, JSON.stringify(sentences, null, 1));

// A short report, so it is easy to see which levels are short of real words.
console.log(`content: ${words.length} words, ${sentences.length} sentences`);
for (const level of levels) {
  const w = words.filter((e) => e.level === level.id).length;
  const s = sentences.filter((e) => e.level === level.id).length;
  console.log(
    `  level ${String(level.id).padStart(2)}  ${level.name.padEnd(22)} +${w} words, +${s} sentences`,
  );
}
