import type { Direction } from "../input/classifyKey";

// A set of choices (buttons or cards) laid out in a grid. Arrow keys move the
// highlight, Enter picks it; the mouse works too. Keys arrive from the single
// keyboard listener, so this never listens to the keyboard itself.
export class Menu {
  private focus: number;

  constructor(
    private readonly items: HTMLElement[],
    private readonly columns: number,
    initialFocus: number,
    private readonly onPick: (index: number) => void,
  ) {
    this.focus = Math.max(0, Math.min(initialFocus, items.length - 1));
    items.forEach((item, i) => {
      item.addEventListener("click", () => onPick(i));
      item.addEventListener("mouseenter", () => this.setFocus(i));
    });
    this.setFocus(this.focus);
  }

  move(direction: Direction): void {
    const step = { left: -1, right: 1, up: -this.columns, down: this.columns }[
      direction
    ];
    let next = this.focus + step;
    // Moving down from a full row onto a shorter last row lands on its last item.
    const lastRow = Math.floor((this.items.length - 1) / this.columns);
    if (
      direction === "down" &&
      next >= this.items.length &&
      Math.floor(this.focus / this.columns) < lastRow
    ) {
      next = this.items.length - 1;
    }
    if (next >= 0 && next < this.items.length) this.setFocus(next);
  }

  pick(): void {
    this.onPick(this.focus);
  }

  private setFocus(index: number): void {
    this.items[this.focus]?.classList.remove("focused");
    this.focus = index;
    this.items[index].classList.add("focused");
  }
}
