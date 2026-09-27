// The on-screen keyboard (US-QWERTY) and which finger types each key.
// Pure data plus lookups: no drawing here, so the picture (FingerGuide.ts)
// can be replaced without touching the logic, and the table is unit-tested.

export type Hand = "L" | "R";
export type FingerName = "pinky" | "ring" | "middle" | "index" | "thumb";

export interface Finger {
  hand: Hand;
  name: FingerName;
}

export interface KeyDef {
  /** Same names as KeyboardEvent.code, e.g. "KeyF", "Digit1", "ShiftLeft". */
  id: string;
  /** Character without Shift ("" for keys like Tab). */
  base: string;
  /** Character with Shift, if different from an uppercase letter. */
  shifted?: string;
  /** Label for keys without a character. */
  label?: string;
  /** Width in key units (a letter key is 1). */
  width: number;
  /** Fingers that press this key (the spacebar has two: both thumbs). */
  fingers: Finger[];
}

const L = (name: FingerName): Finger => ({ hand: "L", name });
const R = (name: FingerName): Finger => ({ hand: "R", name });

function key(
  id: string,
  base: string,
  finger: Finger,
  shifted?: string,
): KeyDef {
  return { id, base, shifted, width: 1, fingers: [finger] };
}

function special(
  id: string,
  label: string,
  width: number,
  fingers: Finger[],
): KeyDef {
  return { id, base: "", label, width, fingers };
}

// Standard touch-typing zones. Each row is listed left to right.
export const KEYBOARD_ROWS: KeyDef[][] = [
  [
    key("Backquote", "`", L("pinky"), "~"),
    key("Digit1", "1", L("pinky"), "!"),
    key("Digit2", "2", L("ring"), "@"),
    key("Digit3", "3", L("middle"), "#"),
    key("Digit4", "4", L("index"), "$"),
    key("Digit5", "5", L("index"), "%"),
    key("Digit6", "6", R("index"), "^"),
    key("Digit7", "7", R("index"), "&"),
    key("Digit8", "8", R("middle"), "*"),
    key("Digit9", "9", R("ring"), "("),
    key("Digit0", "0", R("pinky"), ")"),
    key("Minus", "-", R("pinky"), "_"),
    key("Equal", "=", R("pinky"), "+"),
    special("Backspace", "⌫", 2, [R("pinky")]),
  ],
  [
    special("Tab", "Tab", 1.5, [L("pinky")]),
    key("KeyQ", "q", L("pinky")),
    key("KeyW", "w", L("ring")),
    key("KeyE", "e", L("middle")),
    key("KeyR", "r", L("index")),
    key("KeyT", "t", L("index")),
    key("KeyY", "y", R("index")),
    key("KeyU", "u", R("index")),
    key("KeyI", "i", R("middle")),
    key("KeyO", "o", R("ring")),
    key("KeyP", "p", R("pinky")),
    key("BracketLeft", "[", R("pinky"), "{"),
    key("BracketRight", "]", R("pinky"), "}"),
    { ...key("Backslash", "\\", R("pinky"), "|"), width: 1.5 },
  ],
  [
    special("CapsLock", "Caps", 1.75, [L("pinky")]),
    key("KeyA", "a", L("pinky")),
    key("KeyS", "s", L("ring")),
    key("KeyD", "d", L("middle")),
    key("KeyF", "f", L("index")),
    key("KeyG", "g", L("index")),
    key("KeyH", "h", R("index")),
    key("KeyJ", "j", R("index")),
    key("KeyK", "k", R("middle")),
    key("KeyL", "l", R("ring")),
    key("Semicolon", ";", R("pinky"), ":"),
    key("Quote", "'", R("pinky"), '"'),
    special("Enter", "Enter", 2.25, [R("pinky")]),
  ],
  [
    special("ShiftLeft", "Shift", 2.25, [L("pinky")]),
    key("KeyZ", "z", L("pinky")),
    key("KeyX", "x", L("ring")),
    key("KeyC", "c", L("middle")),
    key("KeyV", "v", L("index")),
    key("KeyB", "b", L("index")),
    key("KeyN", "n", R("index")),
    key("KeyM", "m", R("index")),
    key("Comma", ",", R("middle"), "<"),
    key("Period", ".", R("ring"), ">"),
    key("Slash", "/", R("pinky"), "?"),
    special("ShiftRight", "Shift", 2.75, [R("pinky")]),
  ],
  [
    {
      id: "Space",
      base: " ",
      label: "",
      width: 6.25,
      fingers: [L("thumb"), R("thumb")],
    },
  ],
];

/** Where the spacebar starts, in key units from the left edge. */
export const SPACE_OFFSET = 3.75;

const ALL_KEYS = KEYBOARD_ROWS.flat();
const KEYS_BY_ID = new Map(ALL_KEYS.map((k) => [k.id, k]));

export function keyById(id: string): KeyDef {
  const found = KEYS_BY_ID.get(id);
  if (!found) throw new Error(`Unknown key ${id}`);
  return found;
}

// character → the key that types it, and whether Shift is needed.
const CHAR_TO_KEY = new Map<string, { id: string; shift: boolean }>();
for (const k of ALL_KEYS) {
  if (k.base) CHAR_TO_KEY.set(k.base, { id: k.id, shift: false });
  if (/^[a-z]$/.test(k.base))
    CHAR_TO_KEY.set(k.base.toUpperCase(), { id: k.id, shift: true });
  if (k.shifted) CHAR_TO_KEY.set(k.shifted, { id: k.id, shift: true });
}

export interface Guide {
  /** Keys to highlight: the key itself, plus the opposite-hand Shift if needed. */
  keys: string[];
  /** Fingers to light up. */
  fingers: Finger[];
}

/**
 * Which keys and fingers to show for typing `char`, or undefined for a
 * character the keyboard can't type (e.g. "é").
 * Shift is always pressed with the hand that is NOT typing the key.
 */
export function guideFor(char: string): Guide | undefined {
  const found = CHAR_TO_KEY.get(char);
  if (!found) return undefined;
  const k = keyById(found.id);
  if (!found.shift) return { keys: [k.id], fingers: k.fingers };
  const shift = keyById(k.fingers[0].hand === "L" ? "ShiftRight" : "ShiftLeft");
  return { keys: [k.id, shift.id], fingers: [...k.fingers, ...shift.fingers] };
}
