import { describe, expect, it } from "vitest";
import type { Entry, Level } from "../../src/content/types";
import { buildRunText, type RunnerOptions } from "../../src/engine/levelRunner";
import { seededRandom } from "../../src/engine/random";

const options: RunnerOptions = {
  drillGroup: [2, 4],
  mixedGroup: [2, 5],
  minWords: 3,
  focusChance: 0.6,
  recentWords: 2,
};

function level(overrides: Partial<Level>): Level {
  return {
    id: 1,
    name: "test",
    newKeys: "fj ",
    allKeys: "fj ",
    targetSpm: 30,
    runLength: 60,
    segments: [{ type: "drill", share: 1 }],
    ...overrides,
  };
}

function entry(text: string, lvl: number): Entry {
  return { text, level: lvl, difficulty: text.length };
}

const words = [
  entry("sla", 2),
  entry("als", 2),
  entry("dal", 2),
  entry("kaas", 2),
  entry("dag", 3),
  entry("hal", 3),
  entry("glas", 3),
];
const sentences = [
  entry("De kat zit.", 4),
  entry("Kom je spelen?", 5),
  entry("Wat een heel lange zin is dit.", 4),
];

function run(lvl: Level, seed = 1): string {
  return buildRunText(lvl, { words, sentences }, seededRandom(seed), options);
}

describe("buildRunText", () => {
  it("drills only the new keys", () => {
    const text = run(level({}));
    expect(text).toMatch(/^[fj ]+$/);
  });

  it("is about the run length, with no stray spaces", () => {
    const text = run(level({}));
    expect(text.length).toBeGreaterThanOrEqual(59);
    expect(text.length).toBeLessThan(60 + 6);
    expect(text).not.toMatch(/^ | $|  /);
  });

  it("gives the same text for the same seed, and different text for another", () => {
    expect(run(level({}), 7)).toBe(run(level({}), 7));
    expect(run(level({}), 7)).not.toBe(run(level({}), 8));
  });

  it("puts at least one new key in every mixed group", () => {
    const lvl = level({
      id: 2,
      newKeys: "dk",
      allKeys: "fj dk",
      segments: [{ type: "mixed", share: 1 }],
    });
    for (const group of run(lvl).split(" ")) expect(group).toMatch(/[dk]/);
  });

  it("uses a drill's own keys when given", () => {
    const lvl = level({
      newKeys: "c,.",
      allKeys: "fjc,.",
      segments: [{ type: "drill", share: 1, keys: "c" }],
    });
    expect(run(lvl)).toMatch(/^[c ]+$/);
  });

  it("uses words up to the current level only", () => {
    const lvl = level({
      id: 2,
      allKeys: "fj asdkl",
      segments: [{ type: "words", share: 1 }],
    });
    for (const w of run(lvl).split(" "))
      expect(["sla", "als", "dal", "kaas"]).toContain(w);
  });

  it("falls back to a mixed drill when there are too few words", () => {
    const lvl = level({
      id: 1,
      newKeys: "dk",
      allKeys: "fj dk",
      segments: [{ type: "words", share: 1 }],
    });
    const text = run(lvl, 3);
    expect(text).toMatch(/^[fjdk ]+$/);
  });

  it("can capitalise words and add punctuation", () => {
    const lvl = level({
      id: 3,
      segments: [
        {
          type: "words",
          share: 1,
          capitalize: 1,
          punctuation: ".",
          punctuationChance: 1,
        },
      ],
    });
    for (const w of run(lvl).split(" ")) expect(w).toMatch(/^[A-Z][a-z]+\.$/);
  });

  it("uses sentences within the length limits", () => {
    const lvl = level({
      id: 5,
      runLength: 100,
      segments: [{ type: "sentences", share: 1, maxLength: 15 }],
    });
    const text = run(lvl);
    expect(text).not.toContain("lange zin");
    expect(text).toContain("De kat zit.");
  });

  it("prefers sentences with the new keys when asked", () => {
    const lvl = level({
      id: 5,
      newKeys: "?",
      runLength: 40,
      segments: [{ type: "sentences", share: 1, focusNew: true }],
    });
    expect(run(lvl)).toBe("Kom je spelen? Kom je spelen? Kom je spelen?");
  });

  it("runs segments in order", () => {
    const lvl = level({
      id: 3,
      newKeys: "gh",
      allKeys: "fj asdklgh",
      runLength: 40,
      segments: [
        { type: "drill", share: 0.5 },
        { type: "words", share: 0.5 },
      ],
    });
    const items = run(lvl).split(" ");
    expect(items[0]).toMatch(/^[gh]+$/);
    expect(items.at(-1)).toMatch(/^[a-z]{3,4}$/);
    expect(words.map((w) => w.text)).toContain(items.at(-1));
  });
});
