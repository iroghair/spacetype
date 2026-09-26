import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildEntries,
  parseLines,
  validateLevels,
  withAllKeys,
} from "../../scripts/contentLib.mjs";
import type { Level } from "../../src/content/types";
import { config } from "../../src/config";
import { buildRunText } from "../../src/engine/levelRunner";
import { seededRandom } from "../../src/engine/random";

// Checks the real files in content/nl/ the way the game will use them.
const source = JSON.parse(readFileSync("content/nl/levels.json", "utf8"));
const levels = withAllKeys(source) as Level[];
const read = (file: string) =>
  parseLines(readFileSync(`content/nl/${file}`, "utf8"));
const words = buildEntries(read("words.txt"), "word", levels);
const sentences = buildEntries(read("sentences.txt"), "sentence", levels);

describe("content/nl", () => {
  it("has valid levels, words and sentences", () => {
    expect(validateLevels(source)).toEqual([]);
    expect(words.problems).toEqual([]);
    expect(sentences.problems).toEqual([]);
  });

  for (const level of levels) {
    it(`level ${level.id} (${level.name}) only uses learned keys and has the right length`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const text = buildRunText(
          level,
          { words: words.entries, sentences: sentences.entries },
          seededRandom(seed),
          config.runner,
        );
        const unknown = Array.from(text).filter(
          (c) => !level.allKeys.includes(c),
        );
        expect(unknown).toEqual([]);
        expect(text.length).toBeGreaterThanOrEqual(level.runLength * 0.97);
        expect(text.length).toBeLessThan(level.runLength * 1.5);
      }
    });
  }
});
