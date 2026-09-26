import type { Direction } from "../input/classifyKey";
import { Menu } from "./Menu";
import type { Screen } from "./screens";

// Shows one screen (see screens.ts) over the game and forwards menu keys to it.
export class Overlay {
  private menu?: Menu;

  constructor(private readonly root: HTMLElement) {}

  show(screen: Screen, onPick: (index: number) => void, focus = 0): void {
    this.root.replaceChildren(screen.box);
    this.root.hidden = false;
    this.menu =
      screen.choices.length > 0
        ? new Menu(screen.choices, screen.columns, focus, onPick)
        : undefined;
  }

  hide(): void {
    this.root.hidden = true;
    this.root.replaceChildren();
    this.menu = undefined;
  }

  nav(direction: Direction): void {
    this.menu?.move(direction);
  }

  pick(): void {
    this.menu?.pick();
  }
}
