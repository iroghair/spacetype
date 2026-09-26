import { config } from "../config";
import type { CharInfo } from "../engine/types";
import { lineBreaks, lineOf, type LineRange } from "./lineBreaks";

// The three-line text panel: typed line, current line, next line.
// It only shows engine state; it never decides anything.
export class TextPanel {
  private lines: LineRange[] = [];
  private shownLine = -1;
  /** Span for each character index currently on screen. */
  private spans = new Map<number, HTMLElement>();
  private readonly lineEls: HTMLElement[];
  private readonly arrow: HTMLElement;

  constructor(root: HTMLElement) {
    root.innerHTML = "";
    this.lineEls = ["typed", "current", "next"].map((name) => {
      const el = document.createElement("div");
      el.className = `line ${name}`;
      el.dataset.testid = `line-${name}`;
      root.append(el);
      return el;
    });
    this.arrow = document.createElement("div");
    this.arrow.className = "arrow";
    this.arrow.textContent = "▲";
  }

  setText(text: string): void {
    this.lines = lineBreaks(text, config.panel.maxLineChars);
    this.shownLine = -1;
  }

  /** Redraw from engine state. Cheap enough to call after every event. */
  update(chars: readonly CharInfo[], cursor: number): void {
    const current = lineOf(this.lines, cursor);
    if (current !== this.shownLine) this.buildLines(current, chars);
    for (const [index, span] of this.spans) renderChar(span, chars[index]);
    this.placeArrow(cursor, chars.length);
  }

  private buildLines(current: number, chars: readonly CharInfo[]): void {
    this.shownLine = current;
    this.spans.clear();
    [current - 1, current, current + 1].forEach((lineIndex, i) => {
      const el = this.lineEls[i];
      el.innerHTML = "";
      const range = this.lines[lineIndex];
      // An empty line still needs its height reserved, so give it one blank character.
      if (!range) {
        el.append(makeSpan(" "));
        return;
      }
      for (let index = range.start; index < range.end; index++) {
        const span = makeSpan(chars[index].char);
        span.dataset.index = String(index);
        this.spans.set(index, span);
        el.append(span);
      }
    });
    // The arrow jumps back to the start of the new line without sliding.
    this.arrow.style.transition = "none";
    this.lineEls[1].append(this.arrow);
    void this.arrow.offsetWidth; // apply the jump before turning sliding back on
    this.arrow.style.transition = "";
  }

  private placeArrow(cursor: number, length: number): void {
    const span = this.spans.get(cursor);
    this.arrow.hidden = cursor >= length || !span;
    if (span) this.arrow.style.transform = `translateX(${span.offsetLeft}px)`;
  }
}

function makeSpan(char: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "ch";
  const mark = document.createElement("span");
  mark.className = "mark";
  const glyph = document.createElement("span");
  glyph.className = "glyph";
  glyph.textContent = char;
  span.append(mark, glyph);
  return span;
}

// Show one character according to its state (see PLAN.md "Text panel details").
function renderChar(span: HTMLElement, info: CharInfo): void {
  const [mark, glyph] = span.children as unknown as [HTMLElement, HTMLElement];
  span.className = `ch ${info.state}`;
  const isSpace = info.char === " ";
  // A space that went wrong (or burned) shows as a red dot so there is something to colour.
  glyph.textContent =
    isSpace && (info.state === "wrong" || info.state === "missed")
      ? "·"
      : info.char;
  // Above a wrong letter: the key actually typed. A typed space shows as ␣.
  mark.textContent =
    info.state === "wrong"
      ? info.typed === " "
        ? "␣"
        : (info.typed ?? "")
      : "";
}
