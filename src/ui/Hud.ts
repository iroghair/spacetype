import { config } from "../config";
import { t } from "../i18n";

export interface HudValues {
  /** Right-hand label, e.g. "Level 3" or "Vissen". */
  label: string;
  score: number;
  combo: number;
  multiplier: number;
  spm: number;
  targetSpm: number;
  /** 0–1 */
  accuracy: number;
  /** Turbo multiplier while turbo is on, else undefined. */
  turbo?: number;
}

// The bar at the top: score, combo, SPM meter and accuracy.
// Only touches the DOM when a shown value changes, so it can be updated every frame.
export class Hud {
  private readonly level: HTMLElement;
  private readonly score: HTMLElement;
  private readonly combo: HTMLElement;
  private readonly spm: HTMLElement;
  private readonly meterFill: HTMLElement;
  private readonly meterTarget: HTMLElement;
  private readonly accuracy: HTMLElement;
  private readonly turbo: HTMLElement;
  private shown = new Map<HTMLElement, string>();

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = "";
    // Hidden until the first run starts, so it never shows empty values.
    root.style.visibility = "hidden";
    const item = (label: string, testid: string) => {
      const wrap = document.createElement("div");
      wrap.className = "hud-item";
      if (label) wrap.append(label);
      const value = document.createElement("span");
      value.className = "value";
      value.dataset.testid = testid;
      wrap.append(value);
      root.append(wrap);
      return { wrap, value };
    };

    this.score = item(t("hud.score"), "score").value;
    this.combo = item(t("hud.combo"), "combo").value;

    // SPM meter: a bar that fills up towards (and past) the target line.
    const spmItem = item("", "spm");
    const meter = document.createElement("div");
    meter.className = "meter";
    this.meterFill = document.createElement("div");
    this.meterFill.className = "meter-fill";
    this.meterTarget = document.createElement("div");
    this.meterTarget.className = "meter-target";
    meter.append(this.meterFill, this.meterTarget);
    spmItem.wrap.prepend(meter);
    const unit = document.createElement("span");
    unit.className = "unit";
    unit.textContent = t("hud.spm");
    spmItem.wrap.append(unit);
    this.spm = spmItem.value;
    // Target at a fixed spot; the bar can go up to hud.meterMax × target.
    this.meterTarget.style.left = `${(100 / config.hud.meterMax).toFixed(1)}%`;

    this.accuracy = item("", "accuracy").value;
    this.turbo = document.createElement("div");
    this.turbo.className = "turbo";
    this.turbo.dataset.testid = "turbo";
    this.turbo.hidden = true;
    root.append(this.turbo);
    const spacer = document.createElement("div");
    spacer.className = "hud-spacer";
    root.append(spacer);
    this.level = item("", "level").value;
  }

  update(v: HudValues): void {
    this.root.style.visibility = "visible";
    this.set(this.level, v.label);
    this.set(this.score, v.score.toLocaleString("nl-NL"));
    this.set(
      this.combo,
      v.multiplier > 1 ? `${v.combo} (x${v.multiplier})` : String(v.combo),
    );
    const spm = Math.round(v.spm);
    this.set(this.spm, String(spm));
    this.set(this.accuracy, `${Math.round(v.accuracy * 100)}%`);

    this.turbo.hidden = v.turbo === undefined;
    if (v.turbo !== undefined)
      this.set(this.turbo, t("hud.turbo", { multiplier: v.turbo }));

    const ratio = v.targetSpm > 0 ? spm / v.targetSpm : 0;
    const width = `${(Math.min(ratio, config.hud.meterMax) / config.hud.meterMax) * 100}%`;
    if (this.meterFill.style.width !== width)
      this.meterFill.style.width = width;
    this.meterFill.classList.toggle("on-target", ratio >= 1);
  }

  private set(el: HTMLElement, text: string): void {
    if (this.shown.get(el) !== text) {
      el.textContent = text;
      this.shown.set(el, text);
    }
  }
}
