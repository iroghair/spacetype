export interface LineRange {
  /** Index of the first character of the line. */
  start: number;
  /** Index just past the last character (like Python's slice end). */
  end: number;
}

// Splits text into lines of at most `maxChars` characters, breaking after a
// space. The space stays at the end of its line, because it must be typed too.
// A single word longer than maxChars gets a line of its own.
export function lineBreaks(text: string, maxChars: number): LineRange[] {
  const lines: LineRange[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      // Break just after the last space that fits (the space itself may be the
      // character at `end - 1`, or sit right after the line at `end`).
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace >= start) {
        end = lastSpace + 1;
      } else {
        // No space: the word is longer than a line. Break at the next space.
        const nextSpace = text.indexOf(" ", end);
        end = nextSpace === -1 ? text.length : nextSpace + 1;
      }
    }
    lines.push({ start, end });
    start = end;
  }
  return lines;
}

/** Index of the line containing character `index` (the last line if past the end). */
export function lineOf(lines: LineRange[], index: number): number {
  const found = lines.findIndex((l) => index < l.end);
  return found === -1 ? lines.length - 1 : found;
}
