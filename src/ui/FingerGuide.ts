import { config, cssColor } from "../config";
import {
  guideFor,
  KEYBOARD_ROWS,
  SPACE_OFFSET,
  type Finger,
  type FingerName,
  type Hand,
} from "./fingerMap";

// Draws the on-screen keyboard and two stylised hands as SVG, and highlights
// the key(s) and finger(s) for the next character. All finger logic lives in
// fingerMap.ts; this file only draws.

const SVG = "http://www.w3.org/2000/svg";

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs))
    e.setAttribute(name, String(value));
  return e;
}

const fingerId = (f: Finger) => `${f.hand}-${f.name}`;

export class FingerGuide {
  private readonly keyEls = new Map<string, SVGGElement>();
  private readonly fingerEls = new Map<string, SVGElement>();
  private lit: Element[] = [];

  constructor(private readonly root: HTMLElement) {
    const { unit, gap, handHeight } = config.guide;
    const pitch = unit + gap;
    const rowsHeight = KEYBOARD_ROWS.length * pitch - gap;
    const width = 15 * pitch - gap;
    const height =
      rowsHeight + gap * 2 + handHeight + config.guide.bottomMargin;

    const picture = svg("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
    });
    picture.dataset.testid = "finger-guide";
    this.drawKeyboard(picture, pitch);
    this.drawHand(
      picture,
      "L",
      width / 2 - config.guide.handGap / 2 - 150,
      rowsHeight + gap * 2,
    );
    this.drawHand(
      picture,
      "R",
      width / 2 + config.guide.handGap / 2 + 150,
      rowsHeight + gap * 2,
    );
    root.replaceChildren(picture);
  }

  setVisible(visible: boolean): void {
    this.root.style.visibility = visible ? "visible" : "hidden";
  }

  /** Highlight what's needed to type `char` (nothing when undefined). */
  show(char: string | undefined): void {
    for (const el of this.lit) el.classList.remove("next", "active");
    this.lit = [];
    const guide = char === undefined ? undefined : guideFor(char);
    if (!guide) return;
    for (const id of guide.keys) {
      const el = this.keyEls.get(id);
      if (el) {
        el.classList.add("next");
        this.lit.push(el);
      }
    }
    for (const finger of guide.fingers) {
      const el = this.fingerEls.get(fingerId(finger));
      if (el) {
        el.classList.add("active");
        this.lit.push(el);
      }
    }
  }

  private drawKeyboard(picture: SVGSVGElement, pitch: number): void {
    const { unit } = config.guide;
    KEYBOARD_ROWS.forEach((row, r) => {
      let x = row[0].id === "Space" ? SPACE_OFFSET * pitch : 0;
      const y = r * pitch;
      for (const k of row) {
        const w = k.width * pitch - config.guide.gap;
        const g = svg("g", { class: "key" });
        g.dataset.key = k.id;
        g.dataset.finger = fingerId(k.fingers[0]);
        g.style.setProperty(
          "--finger",
          cssColor(config.colors.fingers[k.fingers[0].name]),
        );
        g.append(svg("rect", { x, y, width: w, height: unit, rx: 5 }));

        const label = k.label ?? k.base;
        if (k.shifted) {
          // Two symbols: the Shift one on top, the plain one below.
          const top = svg("text", {
            x: x + w / 2,
            y: y + unit * 0.42,
            class: "small",
          });
          top.textContent = k.shifted;
          const bottom = svg("text", {
            x: x + w / 2,
            y: y + unit * 0.85,
            class: "small",
          });
          bottom.textContent = k.base;
          g.append(top, bottom);
        } else if (label) {
          const text = svg("text", {
            x: x + w / 2,
            y: y + unit * 0.68,
            class: k.label ? "small" : "",
          });
          text.textContent = label;
          g.append(text);
        }
        picture.append(g);
        this.keyEls.set(k.id, g);
        x += k.width * pitch;
      }
    });
  }

  // A simple cartoon hand with the fingers pointing up at the keyboard.
  // Drawn as a left hand; the right hand is the same shape mirrored.
  // `centerX` is the middle of the hand's 300-unit wide drawing box.
  private drawHand(
    picture: SVGSVGElement,
    hand: Hand,
    centerX: number,
    top: number,
  ): void {
    const scale = config.guide.handHeight / 80;
    const mirror = hand === "R" ? -1 : 1;
    const g = svg("g", {
      transform: `translate(${centerX} ${top}) scale(${mirror * scale} ${scale}) translate(-150 0)`,
    });
    g.dataset.hand = hand;
    // Palm, then the fingers on top of it (x, top, height), then the thumb.
    g.append(
      svg("rect", {
        x: 70,
        y: 40,
        width: 150,
        height: 40,
        rx: 16,
        class: "palm",
      }),
    );
    const fingers: [FingerName, number, number, number][] = [
      ["pinky", 72, 22, 40],
      ["ring", 108, 8, 54],
      ["middle", 144, 0, 62],
      ["index", 180, 10, 52],
    ];
    for (const [name, x, y, h] of fingers) {
      this.addFinger(
        g,
        hand,
        name,
        svg("rect", { x, y, width: 30, height: h, rx: 15 }),
      );
    }
    const thumb = svg("rect", {
      x: 212,
      y: 44,
      width: 56,
      height: 26,
      rx: 13,
      transform: "rotate(-30 212 57)",
    });
    this.addFinger(g, hand, "thumb", thumb);
    picture.append(g);
  }

  private addFinger(
    g: SVGGElement,
    hand: Hand,
    name: FingerName,
    shape: SVGElement,
  ): void {
    shape.setAttribute("class", "finger");
    shape.dataset.finger = `${hand}-${name}`;
    shape.style.setProperty("--finger", cssColor(config.colors.fingers[name]));
    g.append(shape);
    this.fingerEls.set(`${hand}-${name}`, shape);
  }
}
