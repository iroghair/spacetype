import { describe, expect, it } from "vitest";
import {
  buildEntries,
  difficulty,
  levelFor,
  parseLines,
  validateLevels,
  withAllKeys,
} from "../../scripts/contentLib.mjs";

const levels = withAllKeys([
  {
    id: 1,
    name: "één",
    newKeys: "fj ",
    targetSpm: 30,
    runLength: 75,
    segments: [{ type: "drill", share: 1 }],
  },
  {
    id: 2,
    name: "twee",
    newKeys: "asdkl",
    targetSpm: 35,
    runLength: 80,
    segments: [{ type: "drill", share: 1 }],
  },
  {
    id: 3,
    name: "drie",
    newKeys: "KD.",
    targetSpm: 40,
    runLength: 90,
    segments: [{ type: "drill", share: 1 }],
  },
]);

function lines(...texts: string[]) {
  return texts.map((text, i) => ({ line: i + 1, text }));
}

describe("parseLines", () => {
  it("drops blank lines and # comments and keeps line numbers", () => {
    expect(parseLines("# header\nkat\n\n  hond  \n")).toEqual([
      { line: 2, text: "kat" },
      { line: 4, text: "hond" },
    ]);
  });
});

describe("difficulty", () => {
  it("grows with length", () => {
    expect(difficulty("aaaa")).toBeGreaterThan(difficulty("aa"));
  });

  it("is higher for more distinct keys", () => {
    expect(difficulty("asdf")).toBeGreaterThan(difficulty("aaaa"));
  });

  it("is higher for letters off the home row", () => {
    expect(difficulty("qwer")).toBeGreaterThan(difficulty("asdf"));
  });

  it("is higher for capitals and punctuation", () => {
    expect(difficulty("Kat")).toBeGreaterThan(difficulty("kat"));
    expect(difficulty("kat.")).toBeGreaterThan(difficulty("kats"));
  });

  it("follows the documented formula", () => {
    // "sla": length 3, 3 distinct keys, all home row.
    expect(difficulty("sla")).toBe(3 + 1.5);
    // "ok": length 2, 2 distinct keys, 'o' is off the home row ('k' is on it): share 0.5.
    expect(difficulty("ok")).toBe(2 + 1 + 2);
  });
});

describe("withAllKeys / levelFor", () => {
  it("accumulates keys over levels", () => {
    expect(levels.map((l) => l.allKeys)).toEqual([
      "fj ",
      "fj asdkl",
      "fj asdklKD.",
    ]);
  });

  it("finds the earliest level that covers a text", () => {
    expect(levelFor("fj", levels)).toBe(1);
    expect(levelFor("als", levels)).toBe(2);
    expect(levelFor("Dak.", levels)).toBe(3);
    expect(levelFor("zon", levels)).toBeUndefined();
  });
});

describe("validateLevels", () => {
  it("accepts good levels", () => {
    expect(validateLevels(levels)).toEqual([]);
  });

  it("reports wrong ids, unknown segment types and shares that do not add up", () => {
    const problems = validateLevels([
      {
        id: 2,
        name: "x",
        newKeys: "f",
        targetSpm: 30,
        runLength: 50,
        segments: [{ type: "dance", share: 0.5 }],
      },
    ]);
    expect(problems).toEqual([
      "level 1: id should be 1",
      'level 1: unknown segment type "dance"',
      "level 1: segment shares add up to 0.5, not 1",
    ]);
  });
});

describe("buildEntries", () => {
  it("assigns levels and sorts by level, then difficulty, then alphabet", () => {
    const { entries, problems } = buildEntries(
      lines("dal", "fj", "sla"),
      "word",
      levels,
    );
    expect(problems).toEqual([]);
    expect(entries.map((e) => [e.text, e.level])).toEqual([
      ["fj", 1],
      ["dal", 2],
      ["sla", 2],
    ]);
  });

  it("rejects capitals, diacritics and apostrophes in words", () => {
    const { problems } = buildEntries(
      lines("Kat", "café", "zo'n"),
      "word",
      levels,
    );
    expect(problems.map((p) => p.line)).toEqual([1, 2, 3]);
  });

  it("rejects duplicates and keys no level teaches", () => {
    const { problems } = buildEntries(
      lines("sla", "sla", "zon"),
      "word",
      levels,
    );
    expect(problems).toEqual([
      { line: 2, message: '"sla": duplicate of line 1' },
      { line: 3, message: '"zon": uses a key that no level teaches' },
    ]);
  });

  it("allows capitals and punctuation in sentences, but not double spaces", () => {
    const { entries, problems } = buildEntries(
      lines("Dak.", "fj  fj"),
      "sentence",
      levels,
    );
    expect(entries.map((e) => e.text)).toEqual(["Dak."]);
    expect(problems).toEqual([{ line: 2, message: '"fj  fj": double space' }]);
  });
});
