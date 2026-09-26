import { t } from "../i18n";

// Message boxes over the game: start, level complete, keyboard needed.
// All texts come from i18n; textContent is used so no text is ever parsed as HTML.
export class Overlay {
  constructor(private readonly root: HTMLElement) {}

  showStart(): void {
    this.show(
      "start",
      t("start.title"),
      [t("start.level"), t("start.hint")],
      t("start.prompt"),
    );
  }

  showComplete(score: number): void {
    this.show(
      "complete",
      t("complete.title"),
      [t("complete.score", { score: score.toLocaleString("nl-NL") })],
      t("complete.prompt"),
    );
  }

  showKeyboardNeeded(): void {
    this.show("keyboard-needed", t("start.title"), [
      t("warning.keyboardNeeded"),
    ]);
  }

  hide(): void {
    this.root.hidden = true;
  }

  private show(
    id: string,
    title: string,
    lines: string[],
    prompt?: string,
  ): void {
    const box = document.createElement("div");
    box.className = "box";
    box.dataset.testid = `overlay-${id}`;
    const h1 = document.createElement("h1");
    h1.textContent = title;
    box.append(h1);
    for (const line of lines) {
      const p = document.createElement("p");
      p.textContent = line;
      box.append(p);
    }
    if (prompt) {
      const p = document.createElement("p");
      p.className = "prompt";
      p.textContent = prompt;
      box.append(p);
    }
    this.root.replaceChildren(box);
    this.root.hidden = false;
  }
}
