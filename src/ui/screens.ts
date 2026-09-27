import { config } from "../config";
import type { Level } from "../content/types";
import type { ConfusedKey } from "../engine/scoring";
import type { RunStats } from "../engine/types";
import { t } from "../i18n";
import type { LevelBest, Settings } from "../storage/storage";

// Builders for the message boxes shown over the game. Each returns the box and
// the elements that act as choices. Texts always go in via textContent, never
// as HTML.

export interface Screen {
  box: HTMLElement;
  choices: HTMLElement[];
  /** Grid columns for arrow-key movement (1 = a vertical list). */
  columns: number;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

const number = (n: number) => Math.round(n).toLocaleString("nl-NL");

function starsText(stars: number): string {
  return "★".repeat(stars) + "☆".repeat(3 - stars);
}

/** "a s l", with the space written out and the capital letters summarised. */
export function formatKeys(keys: string): string {
  if (/^[A-Z]{26}$/.test(keys)) return t("key.capitals");
  return Array.from(keys)
    .map((k) => (k === " " ? t("key.space") : k))
    .join(" ");
}

/** The settings buttons on the level select screen, in order. */
export type SettingChoice = "fingerGuide" | "sound" | "volume" | "music";

export function levelSelectScreen(
  levels: readonly Level[],
  best: (id: number) => LevelBest | undefined,
  settings: Settings,
): Screen & { settings: SettingChoice[] } {
  const box = el("div", "box wide");
  box.dataset.testid = "screen-select";
  box.append(el("h1", "", t("select.title")));
  const grid = el("div", "level-grid");
  const choices = levels.map((level) => {
    const card = el("button", "level-card");
    card.dataset.testid = `level-${level.id}`;
    const record = best(level.id);
    card.append(
      el("div", "level-number", t("select.level", { id: level.id })),
      el("div", "level-name", level.name),
      el("div", "level-target", t("select.target", { spm: level.targetSpm })),
      el("div", "stars", starsText(record?.stars ?? 0)),
      el(
        "div",
        "level-best",
        record ? t("select.best", { score: number(record.score) }) : "\u00a0",
      ),
    );
    grid.append(card);
    return card;
  });
  // Settings buttons come last, in a row below the grid.
  const onOff = (on: boolean) => t(on ? "settings.on" : "settings.off");
  const settingButtons: [SettingChoice, string][] = [
    [
      "fingerGuide",
      t("settings.fingerGuide", { state: onOff(settings.fingerGuide) }),
    ],
    ["sound", t("settings.sound", { state: onOff(settings.sound) })],
    [
      "volume",
      t("settings.volume", { percent: Math.round(settings.volume * 100) }),
    ],
    ["music", t("settings.music", { state: onOff(settings.music) })],
  ];
  const row = el("div", "choices");
  const buttons = settingButtons.map(([id, label]) => {
    const button = el("button", "choice setting", label);
    button.dataset.testid = `setting-${id}`;
    row.append(button);
    return button;
  });
  box.append(grid, row, el("p", "hint", t("select.hint")));
  return {
    box,
    choices: [...choices, ...buttons],
    columns: 5,
    settings: settingButtons.map(([id]) => id),
  };
}

export function introScreen(level: Level): Screen {
  const box = el("div", "box");
  box.dataset.testid = "screen-intro";
  box.append(
    el("h1", "", t("intro.title", { id: level.id, name: level.name })),
  );
  const newKeys =
    level.newKeys.trim() === ""
      ? t("intro.noNewKeys")
      : t("intro.newKeys", { keys: formatKeys(level.newKeys) });
  box.append(
    el("p", "", newKeys),
    el("p", "", t("intro.target", { spm: level.targetSpm })),
  );
  if (level.id === 1) box.append(el("p", "", t("intro.homeRow")));
  const start = el("button", "prompt", t("intro.start"));
  box.append(start, el("p", "hint", t("intro.back")));
  return { box, choices: [start], columns: 1 };
}

export interface ResultsInfo {
  level: Level;
  stats: RunStats;
  stars: number;
  newRecord: boolean;
  confused: ConfusedKey[];
  hasNext: boolean;
}

/** Choices on the results screen, in order. */
export type ResultsChoice = "again" | "next" | "levels";

export function resultsScreen(
  info: ResultsInfo,
): Screen & { order: ResultsChoice[] } {
  const box = el("div", "box");
  box.dataset.testid = "screen-results";
  box.append(el("h1", "", t("results.title")));
  // Stars pop in one by one (see .star-pop in style.css).
  const stars = el("div", "stars big");
  for (let i = 0; i < 3; i++) {
    const star = el(
      "span",
      i < info.stars ? "star-pop" : "star-empty",
      i < info.stars ? "★" : "☆",
    );
    star.style.animationDelay = `${300 + i * config.celebration.starDelayMs}ms`;
    stars.append(star);
  }
  box.append(stars);
  if (info.newRecord) box.append(el("p", "record", t("results.newRecord")));

  const table = el("table", "stats");
  const rows: [string, string][] = [
    [t("results.spm"), number(info.stats.spm)],
    [t("results.accuracy"), `${Math.round(info.stats.accuracy * 100)}%`],
    [t("results.score"), number(info.stats.score)],
    [t("results.bestCombo"), number(info.stats.bestCombo)],
  ];
  for (const [label, value] of rows) {
    const tr = el("tr");
    tr.append(el("td", "", label), el("td", "value", value));
    table.append(tr);
  }
  box.append(table);

  const shown = info.confused.slice(0, config.scoring.confusedKeysShown);
  if (shown.length === 0) {
    box.append(el("p", "", t("results.noMistakes")));
  } else {
    box.append(el("p", "", t("results.confused")));
    const list = el("ul", "confused");
    list.dataset.testid = "confused-keys";
    const show = (k: string) => (k === " " ? "␣" : k);
    for (const c of shown) {
      list.append(
        el(
          "li",
          "",
          t("results.confusedItem", {
            expected: show(c.expected),
            typed: show(c.typed),
            count: c.count,
          }),
        ),
      );
    }
    box.append(list);
  }

  const order: ResultsChoice[] = info.hasNext
    ? ["again", "next", "levels"]
    : ["again", "levels"];
  const row = el("div", "choices");
  const choices = order.map((choice) => {
    const button = el("button", "choice", t(`results.${choice}`));
    button.dataset.testid = `choice-${choice}`;
    row.append(button);
    return button;
  });
  box.append(row, el("p", "hint", t("results.hint")));
  return { box, choices, columns: choices.length, order };
}

export function messageScreen(text: string): Screen {
  const box = el("div", "box");
  box.append(el("h1", "", t("app.title")), el("p", "", text));
  return { box, choices: [], columns: 1 };
}
