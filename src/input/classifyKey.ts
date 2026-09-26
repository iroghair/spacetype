// Decides what a keydown means for the game. Pure, so it can be unit-tested
// without a browser. See "Keyboard input gotchas" in CLAUDE.md.

export interface KeyLike {
  key: string;
  repeat: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

export type KeyAction =
  | { kind: "char"; char: string }
  | { kind: "enter" }
  | { kind: "ignore"; preventDefault: boolean };

// Keys whose browser default (scrolling, quick-find, going back) must be blocked.
const BLOCKED_DEFAULTS = new Set([" ", "Backspace", "'", "/"]);

export function classifyKey(e: KeyLike): KeyAction {
  // Leave browser shortcuts (Ctrl+R, Cmd+W, ...) and Alt/AltGr combinations alone.
  if (e.ctrlKey || e.metaKey || e.altKey)
    return { kind: "ignore", preventDefault: false };

  const preventDefault = BLOCKED_DEFAULTS.has(e.key);

  // Holding a key down must not type it again and again.
  if (e.repeat) return { kind: "ignore", preventDefault };

  if (e.key === "Enter") return { kind: "enter" };

  // A single character is something typed: a letter, digit, punctuation or space.
  // Named keys (Shift, CapsLock, Tab, ArrowLeft, Backspace, ...) are longer than one.
  // "Dead" is what the US-International layout reports for ' " ` ~ ^ before the
  // next key; it is long too, so it is ignored here.
  if (e.key.length === 1) return { kind: "char", char: e.key };

  return { kind: "ignore", preventDefault };
}
