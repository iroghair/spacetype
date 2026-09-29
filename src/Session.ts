import type { Sound } from "./audio/Sound";
import { config } from "./config";
import {
  levelSource,
  textCount,
  topicSource,
  type TextSource,
} from "./content/TextSource";
import type { Band, Content, Level, Topic } from "./content/types";
import { confusedKeys, starsFor } from "./engine/scoring";
import { TypingEngine } from "./engine/TypingEngine";
import type { GameEvent } from "./engine/types";
import type { PlayScene } from "./game/scenes/PlayScene";
import { t } from "./i18n";
import type { Direction } from "./input/classifyKey";
import type { SaveStore, Settings } from "./storage/storage";
import type { FingerGuide } from "./ui/FingerGuide";
import type { Fireworks } from "./ui/Fireworks";
import type { Hud } from "./ui/Hud";
import type { Overlay } from "./ui/Overlay";
import {
  bandSelectScreen,
  introScreen,
  levelSelectScreen,
  resetConfirmScreen,
  resultsScreen,
  settingsScreen,
  topicIntroScreen,
  topicSelectScreen,
  type MenuChoice,
  type SettingChoice,
} from "./ui/screens";
import type { TextPanel } from "./ui/TextPanel";

// What the game is doing right now:
//   menu:      a screen (menus, intro, results) is up; arrows and Enter go to it
//   playing:   typed characters go to the engine
//   finishing: the last letter is done; short pause before the results
type Phase = "menu" | "playing" | "finishing";

// What is being played: a level, or a topic at a difficulty band.
type Run =
  { kind: "level"; level: Level } | { kind: "topic"; topic: Topic; band: Band };

declare global {
  interface Window {
    /** Dev-only hook so the Playwright tests can read the run text. */
    __spacetype?: { text: string };
    /** Dev-only: current frames per second. */
    __fps?: () => number;
  }
}

// Connects the pieces: keyboard → engine → events → play field and DOM.
export class Session {
  private phase: Phase = "menu";
  private engine?: TypingEngine;
  private run?: Run;
  private source?: TextSource;
  /** Where Escape goes from the current screen (nothing on the level menu). */
  private back?: () => void;

  constructor(
    private readonly content: Content,
    private readonly scene: PlayScene,
    private readonly hud: Hud,
    private readonly panel: TextPanel,
    private readonly overlay: Overlay,
    private readonly saves: SaveStore,
    private readonly guide: FingerGuide,
    private readonly sound: Sound,
    private readonly fireworks: Fireworks,
  ) {
    this.applySettings(this.saves.settings);
    this.showLevelSelect(this.content.levels[0]);
  }

  onChar(char: string, timeMs: number): void {
    if (this.phase === "playing" && this.engine)
      this.dispatch(this.engine.key(char, timeMs));
  }

  onEnter(): void {
    if (this.phase === "menu") this.overlay.pick();
  }

  onNav(direction: Direction): void {
    if (this.phase === "menu") this.overlay.nav(direction);
  }

  onEscape(): void {
    if (this.phase !== "finishing") this.back?.();
  }

  /** Called every frame. Keeps running after completion so wrong letters still burn. */
  tick(timeMs: number): void {
    if (!this.engine) return;
    this.dispatch(this.engine.update(timeMs));
    this.refreshHud(timeMs);
  }

  // ---------- Menus ----------

  /** `focus` is a level, or one of the buttons below the grid. */
  private showLevelSelect(focus: Level | MenuChoice): void {
    this.stopRun();
    this.back = undefined;
    const levels = this.content.levels;
    const screen = levelSelectScreen(levels, (key) => this.saves.best(key));
    this.overlay.show(
      screen,
      (i) => {
        if (i < levels.length)
          return this.showIntro({ kind: "level", level: levels[i] });
        if (screen.extras[i - levels.length] === "topics")
          this.showTopicSelect();
        else this.showSettings();
      },
      typeof focus === "string"
        ? levels.length + screen.extras.indexOf(focus)
        : levels.indexOf(focus),
    );
  }

  private showSettings(focus: SettingChoice = "fingerGuide"): void {
    this.stopRun();
    this.back = () => this.showLevelSelect("settings");
    const screen = settingsScreen(this.saves.settings);
    this.overlay.show(
      screen,
      (i) => {
        const choice = screen.order[i];
        if (choice === "back") return this.showLevelSelect("settings");
        if (choice === "reset") return this.showResetConfirm();
        this.changeSetting(choice);
        this.showSettings(choice);
      },
      screen.order.indexOf(focus),
    );
  }

  private showResetConfirm(): void {
    this.back = () => this.showSettings("reset");
    this.overlay.show(
      resetConfirmScreen(),
      (i) => {
        if (i === 1) {
          this.saves.reset();
          this.applySettings(this.saves.settings);
        }
        this.showSettings("reset");
      },
      0, // "No" is highlighted, so a quick Enter doesn't wipe anything
    );
  }

  private showTopicSelect(focus?: Topic): void {
    this.stopRun();
    this.back = () => this.showLevelSelect("topics");
    const topics = this.content.topics.topics;
    this.overlay.show(
      topicSelectScreen(topics),
      (i) => {
        if (topics[i].texts.length > 0) this.showBandSelect(topics[i]);
      },
      focus ? topics.indexOf(focus) : 0,
    );
  }

  private showBandSelect(topic: Topic, focus?: Band): void {
    this.stopRun();
    this.back = () => this.showTopicSelect(topic);
    const bands = this.content.topics.bands;
    const best = (band: Band) =>
      this.saves.best(topicSource(topic, band, config.runner).id);
    // Start on the first band that has texts.
    const first = bands.findIndex((b) => textCount(topic, b) > 0);
    this.overlay.show(
      bandSelectScreen(topic, bands, best),
      (i) => {
        if (textCount(topic, bands[i]) > 0)
          this.showIntro({ kind: "topic", topic, band: bands[i] });
      },
      focus ? bands.indexOf(focus) : first,
    );
  }

  private changeSetting(
    setting: Exclude<SettingChoice, "reset" | "back">,
  ): void {
    const current = this.saves.settings;
    if (setting === "volume") {
      // Cycle to the next volume step (after the loudest, back to the quietest).
      const steps = config.audio.volumeSteps;
      const next = steps.find((v) => v > current.volume + 0.001) ?? steps[0];
      this.saves.updateSettings({ volume: next });
    } else {
      this.saves.updateSettings({ [setting]: !current[setting] });
    }
    this.applySettings(this.saves.settings);
    if (setting !== "fingerGuide") this.sound.correct(0); // let the player hear the change
  }

  private applySettings(settings: Settings): void {
    this.guide.setVisible(settings.fingerGuide);
    this.sound.setEnabled(settings.sound);
    this.sound.setVolume(settings.volume);
    this.sound.setMusic(settings.music);
    this.scene.setFlyBys(settings.flyBys);
  }

  // ---------- Running a level or topic ----------

  /** The list a run belongs to, to return to afterwards. */
  private backToList(run: Run): void {
    if (run.kind === "level") this.showLevelSelect(run.level);
    else this.showBandSelect(run.topic, run.band);
  }

  private sourceFor(run: Run): TextSource {
    if (run.kind === "topic")
      return topicSource(run.topic, run.band, config.runner);
    return levelSource(
      run.level,
      this.content,
      t("hud.level", { id: run.level.id }),
      config.runner,
    );
  }

  private showIntro(run: Run): void {
    this.stopRun();
    this.run = run;
    this.back = () => this.backToList(run);
    const screen =
      run.kind === "level"
        ? introScreen(run.level)
        : topicIntroScreen(run.topic, run.band);
    this.overlay.show(screen, () => this.start(run));
  }

  private start(run: Run): void {
    const source = this.sourceFor(run);
    const text = source.nextText(Math.random);
    if (import.meta.env.DEV) window.__spacetype = { text };
    this.run = run;
    this.source = source;
    this.back = () => this.backToList(run);
    this.engine = new TypingEngine(text, {
      ...config.stream,
      targetSpm: source.targetSpm,
      pointsPerStroke: config.scoring.pointsPerStroke,
      comboTiers: config.scoring.comboTiers,
      flawlessWordBonus: config.scoring.flawlessWordBonus,
      spmWindowMs: config.scoring.spmWindowMs,
      spmMinWindowMs: config.scoring.spmMinWindowMs,
      turbo: config.scoring.turbo,
    });
    this.engine.start(performance.now());
    this.fireworks.stop();
    this.phase = "playing";
    this.overlay.hide();
    this.scene.startRun(this.engine);
    this.panel.setText(text);
    this.refreshText();
  }

  private stopRun(): void {
    this.phase = "menu";
    this.engine = undefined;
    this.scene.stopRun();
    this.guide.show(undefined);
  }

  /** Update the text panel and the finger guide for the next character. */
  private refreshText(): void {
    const engine = this.engine!;
    this.panel.update(engine.chars, engine.cursor);
    this.guide.show(engine.chars[engine.cursor]?.char);
  }

  private dispatch(events: GameEvent[]): void {
    if (events.length === 0 || !this.engine) return;
    this.scene.handleEvents(events);
    this.sound.handleEvents(events, this.engine.combo);
    this.refreshText();
    if (events.some((e) => e.type === "levelComplete")) {
      this.phase = "finishing";
      const engine = this.engine;
      // A UI pause, not a game rule, so a timer is fine here (the engine has none).
      setTimeout(() => {
        // Ignore if the player left the run in the meantime.
        if (this.engine === engine) this.showResults(engine);
      }, config.ui.completeDelayMs);
    }
  }

  private showResults(engine: TypingEngine): void {
    const run = this.run!;
    const source = this.source!;
    const stats = engine.stats();
    const stars = starsFor(
      stats.accuracy,
      stats.spm,
      source.targetSpm,
      config.scoring.stars,
    );
    const previous = this.saves.record(source.id, {
      score: stats.score,
      spm: stats.spm,
      accuracy: stats.accuracy,
      stars,
    });
    // A record only counts when there was an earlier result to beat.
    const newRecord =
      previous !== undefined &&
      (stats.score > previous.score || stats.spm > previous.spm);

    // Only levels have a "next" one; topics go back to their difficulty list.
    const levels = this.content.levels;
    const next =
      run.kind === "level" ? levels[levels.indexOf(run.level) + 1] : undefined;
    const screen = resultsScreen({
      stats,
      stars,
      newRecord,
      confused: confusedKeys(engine.chars),
      hasNext: next !== undefined,
      backLabel: t(run.kind === "level" ? "results.levels" : "select.topics"),
    });
    this.phase = "menu";
    this.back = () => this.backToList(run);
    this.celebrate(stars, newRecord);
    this.overlay.show(
      screen,
      (i) => {
        const choice = screen.order[i];
        if (choice === "again") this.showIntro(run);
        else if (choice === "next" && next)
          this.showIntro({ kind: "level", level: next });
        else if (run.kind === "level") this.showLevelSelect(next ?? run.level);
        else this.showBandSelect(run.topic, run.band);
      },
      screen.order.indexOf(next ? "next" : "again"),
    );
  }

  // Fireworks and fanfare for the results screen; a record gets the big version.
  private celebrate(stars: number, newRecord: boolean): void {
    const { celebration } = config;
    if (newRecord) {
      this.fireworks.show(celebration.recordBursts, ["star", "circle"]);
      this.scene.celebrateRecord();
      this.sound.record();
    } else {
      this.fireworks.show(celebration.levelCompleteBursts);
      this.sound.levelComplete();
    }
    // A tick for each star as it pops in (timed to the CSS animation delays).
    for (let i = 0; i < stars; i++) {
      window.setTimeout(
        () => this.sound.star(i),
        300 + i * celebration.starDelayMs,
      );
    }
  }

  private refreshHud(timeMs: number): void {
    const engine = this.engine!;
    const source = this.source!;
    this.hud.update({
      label: source.label,
      score: engine.score,
      combo: engine.combo,
      multiplier: engine.multiplier,
      spm: engine.liveSpm(
        timeMs,
        config.scoring.spmWindowMs,
        config.scoring.spmMinWindowMs,
      ),
      targetSpm: source.targetSpm,
      accuracy: engine.accuracy,
      turbo: engine.turbo ? config.scoring.turbo.multiplier : undefined,
    });
  }
}
