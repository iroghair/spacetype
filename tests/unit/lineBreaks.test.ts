import { describe, expect, it } from "vitest";
import { lineBreaks, lineOf } from "../../src/ui/lineBreaks";

function split(text: string, maxChars: number): string[] {
  return lineBreaks(text, maxChars).map((l) => text.slice(l.start, l.end));
}

describe("lineBreaks", () => {
  it("keeps short text on one line", () => {
    expect(split("fj jf", 20)).toEqual(["fj jf"]);
  });

  it("breaks after a space and keeps the space on the first line", () => {
    expect(split("aaa bbb ccc", 8)).toEqual(["aaa bbb ", "ccc"]);
  });

  it("uses a space that falls just past the limit", () => {
    expect(split("aaa bbb ccc", 7)).toEqual(["aaa bbb ", "ccc"]);
  });

  it("puts a word longer than a line on its own line", () => {
    expect(split("a bbbbbbbbbb c", 5)).toEqual(["a ", "bbbbbbbbbb ", "c"]);
  });

  it("covers every character exactly once", () => {
    const text = "de kat zit op de mat en het visje zwemt in de sloot";
    expect(split(text, 12).join("")).toBe(text);
  });

  it("returns no lines for empty text", () => {
    expect(lineBreaks("", 10)).toEqual([]);
  });
});

describe("lineOf", () => {
  const lines = lineBreaks("aaa bbb ccc", 8); // "aaa bbb " | "ccc"

  it("finds the line containing a character", () => {
    expect(lineOf(lines, 0)).toBe(0);
    expect(lineOf(lines, 7)).toBe(0);
    expect(lineOf(lines, 8)).toBe(1);
  });

  it("returns the last line past the end", () => {
    expect(lineOf(lines, 99)).toBe(1);
  });
});
