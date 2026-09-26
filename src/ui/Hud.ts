import { t } from "../i18n";

// The bar at the top. For now only the score; combo and SPM follow in phase 3.
export class Hud {
  private readonly scoreValue: HTMLElement;

  constructor(root: HTMLElement) {
    root.innerHTML = "";
    const score = document.createElement("div");
    score.textContent = t("hud.score");
    this.scoreValue = document.createElement("span");
    this.scoreValue.className = "value";
    this.scoreValue.dataset.testid = "score";
    score.append(this.scoreValue);
    root.append(score);
    this.setScore(0);
  }

  setScore(score: number): void {
    // nl-NL groups thousands with a dot: 12.340
    this.scoreValue.textContent = score.toLocaleString("nl-NL");
  }
}
