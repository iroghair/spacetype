import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withAllKeys } from "../../scripts/contentLib.mjs";
import { guideFor, KEYBOARD_ROWS, type Finger } from "../../src/ui/fingerMap";

const f = (s: string): Finger => {
  const [hand, name] = s.split("-") as [Finger["hand"], Finger["name"]];
  return { hand, name };
};

describe("guideFor: home row", () => {
  it.each([
    ["a", "KeyA", "L-pinky"],
    ["s", "KeyS", "L-ring"],
    ["d", "KeyD", "L-middle"],
    ["f", "KeyF", "L-index"],
    ["g", "KeyG", "L-index"],
    ["h", "KeyH", "R-index"],
    ["j", "KeyJ", "R-index"],
    ["k", "KeyK", "R-middle"],
    ["l", "KeyL", "R-ring"],
    [";", "Semicolon", "R-pinky"],
  ])("%s is %s with %s", (char, key, finger) => {
    expect(guideFor(char)).toEqual({ keys: [key], fingers: [f(finger)] });
  });
});

describe("guideFor: other rows", () => {
  it.each([
    ["q", "L-pinky"],
    ["w", "L-ring"],
    ["e", "L-middle"],
    ["r", "L-index"],
    ["t", "L-index"],
    ["y", "R-index"],
    ["u", "R-index"],
    ["i", "R-middle"],
    ["o", "R-ring"],
    ["p", "R-pinky"],
    ["z", "L-pinky"],
    ["x", "L-ring"],
    ["c", "L-middle"],
    ["v", "L-index"],
    ["b", "L-index"],
    ["n", "R-index"],
    ["m", "R-index"],
    [",", "R-middle"],
    [".", "R-ring"],
    ["/", "R-pinky"],
    ["-", "R-pinky"],
  ])("%s is typed with %s", (char, finger) => {
    expect(guideFor(char)?.fingers).toEqual([f(finger)]);
  });

  it("types space with both thumbs", () => {
    expect(guideFor(" ")).toEqual({
      keys: ["Space"],
      fingers: [f("L-thumb"), f("R-thumb")],
    });
  });
});

describe("guideFor: Shift uses the opposite hand", () => {
  it("left-hand capital → right Shift, right pinky", () => {
    expect(guideFor("F")).toEqual({
      keys: ["KeyF", "ShiftRight"],
      fingers: [f("L-index"), f("R-pinky")],
    });
    expect(guideFor("A")).toEqual({
      keys: ["KeyA", "ShiftRight"],
      fingers: [f("L-pinky"), f("R-pinky")],
    });
  });

  it("right-hand capital → left Shift, left pinky", () => {
    expect(guideFor("J")).toEqual({
      keys: ["KeyJ", "ShiftLeft"],
      fingers: [f("R-index"), f("L-pinky")],
    });
    expect(guideFor("P")).toEqual({
      keys: ["KeyP", "ShiftLeft"],
      fingers: [f("R-pinky"), f("L-pinky")],
    });
  });

  it("shifted punctuation works the same way", () => {
    expect(guideFor("?")).toEqual({
      keys: ["Slash", "ShiftLeft"],
      fingers: [f("R-pinky"), f("L-pinky")],
    });
    expect(guideFor(":")).toEqual({
      keys: ["Semicolon", "ShiftLeft"],
      fingers: [f("R-pinky"), f("L-pinky")],
    });
    expect(guideFor("!")).toEqual({
      keys: ["Digit1", "ShiftRight"],
      fingers: [f("L-pinky"), f("R-pinky")],
    });
  });
});

describe("guideFor: unknown characters", () => {
  it("returns undefined for characters not on a US keyboard", () => {
    expect(guideFor("é")).toBeUndefined();
  });
});

describe("keyboard table", () => {
  it("gives every key at least one finger", () => {
    for (const k of KEYBOARD_ROWS.flat())
      expect(k.fingers.length).toBeGreaterThan(0);
  });

  it("covers every key used in levels 1-13", () => {
    const levels = withAllKeys(
      JSON.parse(readFileSync("content/nl/levels.json", "utf8")),
    );
    const keys = levels.find((l) => l.id === 13)!.allKeys;
    const missing = Array.from(keys).filter((c) => guideFor(c) === undefined);
    expect(missing).toEqual([]);
  });
});
