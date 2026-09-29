import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bandFor,
  buildTopicTexts,
  parseLines,
  validateTopicsConfig,
} from "../../scripts/contentLib.mjs";

const bands = [
  { id: 1, name: "Makkelijk", maxLength: 20, targetSpm: 60, runLength: 100 },
  { id: 2, name: "Moeilijk", maxLength: 40, targetSpm: 80, runLength: 150 },
];

const lines = (...texts: string[]) =>
  texts.map((text, i) => ({ line: i + 1, text }));

describe("bandFor", () => {
  it("puts a text in the first band it fits", () => {
    expect(bandFor("Ik zie een vis.", bands)).toBe(1);
    expect(bandFor("De vis zwemt in de grote rivier.", bands)).toBe(2);
    expect(bandFor("x".repeat(41), bands)).toBeUndefined();
  });
});

describe("buildTopicTexts", () => {
  it("gives each approved line a band and a difficulty", () => {
    const { texts, problems } = buildTopicTexts(
      lines("De vis zwemt in de grote rivier.", "Ik zie een vis."),
      bands,
    );
    expect(problems).toEqual([]);
    expect(texts.map((t) => [t.text, t.band])).toEqual([
      ["Ik zie een vis.", 1],
      ["De vis zwemt in de grote rivier.", 2],
    ]);
  });

  it("rejects diacritics, apostrophes, duplicates and texts that are too long", () => {
    const { problems } = buildTopicTexts(
      lines(
        "Een café.",
        "Zo'n vis.",
        "Ik zie een vis.",
        "ik zie een vis.",
        "x".repeat(41),
      ),
      bands,
    );
    expect(problems.map((p) => p.line)).toEqual([1, 2, 4, 5]);
  });
});

describe("validateTopicsConfig", () => {
  it("accepts the real topics.json", () => {
    const config = JSON.parse(
      readFileSync("content/nl/topics/topics.json", "utf8"),
    );
    expect(validateTopicsConfig(config)).toEqual([]);
    expect(config.topics.map((t: { id: string }) => t.id)).toEqual([
      "vissen",
      "muziek",
      "minecraft",
      "sport",
      "strips",
    ]);
  });

  it("reports bands out of order and bad topic ids", () => {
    const problems = validateTopicsConfig({
      bands: [
        { id: 1, name: "a", maxLength: 50, targetSpm: 60, runLength: 100 },
        { id: 2, name: "b", maxLength: 40, targetSpm: 60, runLength: 100 },
      ],
      topics: [{ id: "Mine Craft", name: "x", about: "y" }],
    });
    expect(problems).toEqual([
      "band 2: maxLength must be larger than the band before",
      'topic "Mine Craft": id must be lowercase letters (it is the file name)',
    ]);
  });
});

describe("content/nl/topics (the approved files)", () => {
  const config = JSON.parse(
    readFileSync("content/nl/topics/topics.json", "utf8"),
  );
  for (const topic of config.topics) {
    it(`${topic.id}.txt is valid and has texts in every band`, () => {
      const { texts, problems } = buildTopicTexts(
        parseLines(readFileSync(`content/nl/topics/${topic.id}.txt`, "utf8")),
        config.bands,
      );
      expect(problems).toEqual([]);
      for (const band of config.bands)
        expect(texts.some((t) => t.band === band.id)).toBe(true);
    });
  }
});
