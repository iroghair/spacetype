import { describe, expect, it } from "vitest";
import { classifyKey, type KeyLike } from "../../src/input/classifyKey";

function key(k: string, extra: Partial<KeyLike> = {}): KeyLike {
  return {
    key: k,
    repeat: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...extra,
  };
}

describe("classifyKey", () => {
  it("passes letters through as typed, including capitals", () => {
    expect(classifyKey(key("f"))).toEqual({ kind: "char", char: "f" });
    expect(classifyKey(key("F"))).toEqual({ kind: "char", char: "F" });
  });

  it("passes space and punctuation through", () => {
    expect(classifyKey(key(" "))).toEqual({ kind: "char", char: " " });
    expect(classifyKey(key("/"))).toEqual({ kind: "char", char: "/" });
    expect(classifyKey(key("'"))).toEqual({ kind: "char", char: "'" });
  });

  it("recognises Enter", () => {
    expect(classifyKey(key("Enter"))).toEqual({ kind: "enter" });
  });

  it("ignores modifier-only keys", () => {
    for (const k of [
      "Shift",
      "Control",
      "Alt",
      "Meta",
      "CapsLock",
      "AltGraph",
    ]) {
      expect(classifyKey(key(k))).toEqual({
        kind: "ignore",
        preventDefault: false,
      });
    }
  });

  it("ignores dead keys (US-International)", () => {
    expect(classifyKey(key("Dead"))).toEqual({
      kind: "ignore",
      preventDefault: false,
    });
  });

  it("ignores auto-repeat but still blocks scrolling on a held space", () => {
    expect(classifyKey(key("f", { repeat: true }))).toEqual({
      kind: "ignore",
      preventDefault: false,
    });
    expect(classifyKey(key(" ", { repeat: true }))).toEqual({
      kind: "ignore",
      preventDefault: true,
    });
  });

  it("does nothing on Backspace, but blocks the browser default", () => {
    expect(classifyKey(key("Backspace"))).toEqual({
      kind: "ignore",
      preventDefault: true,
    });
  });

  it("leaves browser shortcuts alone", () => {
    expect(classifyKey(key("r", { ctrlKey: true }))).toEqual({
      kind: "ignore",
      preventDefault: false,
    });
    expect(classifyKey(key("w", { metaKey: true }))).toEqual({
      kind: "ignore",
      preventDefault: false,
    });
    expect(classifyKey(key("e", { altKey: true }))).toEqual({
      kind: "ignore",
      preventDefault: false,
    });
  });
});
