import { config } from "../config";
import { textCount } from "../content/TextSource";
import type { Band, Level, Topic } from "../content/types";
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

/** The buttons below the level grid, in order. */
export type MenuChoice = "topics" | "settings";

export function levelSelectScreen(
  levels: readonly Level[],
  best: (key: string) => LevelBest | undefined,
): Screen & { extras: MenuChoice[] } {
  const box = el("div", "box wide");
  box.dataset.testid = "screen-select";
  box.append(el("h1", "", t("select.title")));
  const grid = el("div", "level-grid");
  const choices = levels.map((level) => {
    const card = el("button", "level-card");
    card.dataset.testid = `level-${level.id}`;
    const record = best(String(level.id));
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
  // Topics and settings: a row below the grid.
  const extras: [MenuChoice, string][] = [
    ["topics", t("select.topics")],
    ["settings", t("select.settings")],
  ];
  const row = el("div", "choices");
  const buttons = extras.map(([id, label]) => {
    const button = el("button", "choice menu-button", label);
    button.dataset.testid = `menu-${id}`;
    row.append(button);
    return button;
  });
  box.append(grid, row, el("p", "hint", t("select.hint")));
  return {
    box,
    choices: [...choices, ...buttons],
    columns: 5,
    extras: extras.map(([id]) => id),
  };
}

/** The choices on the settings screen, top to bottom. */
export type SettingChoice =
  "fingerGuide" | "sound" | "volume" | "music" | "flyBys" | "reset" | "back";

export function settingsScreen(
  settings: Settings,
): Screen & { order: SettingChoice[] } {
  const box = el("div", "box");
  box.dataset.testid = "screen-settings";
  box.append(el("h1", "", t("settings.title")));
  const onOff = (on: boolean) => t(on ? "settings.on" : "settings.off");
  const items: [SettingChoice, string][] = [
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
    ["flyBys", t("settings.flyBys", { state: onOff(settings.flyBys) })],
    ["reset", t("settings.reset")],
    ["back", t("settings.back")],
  ];
  const list = el("div", "settings-list");
  const choices = items.map(([id, label]) => {
    const button = el(
      "button",
      `choice setting${id === "reset" ? " danger" : ""}`,
      label,
    );
    button.dataset.testid = `setting-${id}`;
    list.append(button);
    return button;
  });
  box.append(list, el("p", "hint", t("settings.hint")));
  return { box, choices, columns: 1, order: items.map(([id]) => id) };
}

/** "Are you sure?" before wiping all saved progress. Choice 0 = no, 1 = yes. */
export function resetConfirmScreen(): Screen {
  const box = el("div", "box narrow");
  box.dataset.testid = "screen-reset";
  box.append(el("h1", "", t("reset.title")), el("p", "", t("reset.text")));
  const row = el("div", "choices");
  const no = el("button", "choice", t("reset.no"));
  no.dataset.testid = "reset-no";
  const yes = el("button", "choice danger", t("reset.yes"));
  yes.dataset.testid = "reset-yes";
  row.append(no, yes);
  box.append(row);
  return { box, choices: [no, yes], columns: 2 };
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

export function topicSelectScreen(topics: readonly Topic[]): Screen {
  const box = el("div", "box wide");
  box.dataset.testid = "screen-topics";
  box.append(el("h1", "", t("topics.title")));
  const grid = el("div", "level-grid");
  const choices = topics.map((topic) => {
    const card = el("button", "level-card topic-card");
    card.dataset.testid = `topic-${topic.id}`;
    const count = topic.texts.length;
    // A topic without approved texts can't be played yet.
    if (count === 0) card.classList.add("disabled");
    card.append(
      el("div", "level-name", topic.name),
      el(
        "div",
        "level-target",
        count > 0 ? t("topics.count", { count }) : t("topics.empty"),
      ),
    );
    grid.append(card);
    return card;
  });
  box.append(grid, el("p", "hint", t("topics.hint")));
  return { box, choices, columns: 5 };
}

export function bandSelectScreen(
  topic: Topic,
  bands: readonly Band[],
  best: (band: Band) => LevelBest | undefined,
): Screen {
  const box = el("div", "box");
  box.dataset.testid = "screen-bands";
  box.append(el("h1", "", t("bands.title", { topic: topic.name })));
  const row = el("div", "choices bands");
  const choices = bands.map((band) => {
    const button = el("button", "choice band");
    button.dataset.testid = `band-${band.id}`;
    if (textCount(topic, band) === 0) button.classList.add("disabled");
    button.append(
      el("div", "", band.name),
      el("div", "level-target", t("select.target", { spm: band.targetSpm })),
      el("div", "stars", starsText(best(band)?.stars ?? 0)),
    );
    row.append(button);
    return button;
  });
  box.append(row, el("p", "hint", t("topics.hint")));
  return { box, choices, columns: bands.length };
}

export function topicIntroScreen(topic: Topic, band: Band): Screen {
  const box = el("div", "box");
  box.dataset.testid = "screen-intro";
  box.append(
    el("h1", "", t("topicIntro.title", { topic: topic.name, band: band.name })),
  );
  box.append(el("p", "", t("intro.target", { spm: band.targetSpm })));
  const start = el("button", "prompt", t("intro.start"));
  box.append(start, el("p", "hint", t("topicIntro.back")));
  return { box, choices: [start], columns: 1 };
}

export interface ResultsInfo {
  stats: RunStats;
  stars: number;
  newRecord: boolean;
  confused: ConfusedKey[];
  hasNext: boolean;
  /** Label of the "back to the list" button ("Levels" or "Onderwerpen"). */
  backLabel: string;
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
    const label = choice === "levels" ? info.backLabel : t(`results.${choice}`);
    const button = el("button", "choice", label);
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
