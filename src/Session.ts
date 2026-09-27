import type { Sound } from "./audio/Sound";
import { config } from "./config";
import type { Content, Level } from "./content/types";
import { buildRunText } from "./engine/levelRunner";
import { confusedKeys, starsFor } from "./engine/scoring";
import { TypingEngine } from "./engine/TypingEngine";
import type { GameEvent } from "./engine/types";
import type { PlayScene } from "./game/scenes/PlayScene";
import type { Direction } from "./input/classifyKey";
import type { SaveStore, Settings } from "./storage/storage";
import type { FingerGuide } from "./ui/FingerGuide";
import type { Fireworks } from "./ui/Fireworks";
import type { Hud } from "./ui/Hud";
import type { Overlay } from "./ui/Overlay";
import {
  introScreen,
  levelSelectScreen,
  resultsScreen,
  type SettingChoice,
} from "./ui/screens";
import type { TextPanel } from "./ui/TextPanel";

// What the game is doing right now:
//   menu:      a screen (level select, intro, results) is up; arrows and Enter go to it
//   playing:   typed characters go to the engine
//   finishing: the last letter is done; short pause before the results
type Phase = "menu" | "playing" | "finishing";

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
  private level?: Level;

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
    // From a run or the intro, Escape goes back to the level list.
    if (this.phase !== "finishing" && this.level)
      this.showLevelSelect(this.level);
  }

  /** Called every frame. Keeps running after completion so wrong letters still burn. */
  tick(timeMs: number): void {
    if (!this.engine) return;
    this.dispatch(this.engine.update(timeMs));
    this.refreshHud(timeMs);
  }

  /** `focus` is a level, or one of the settings buttons below the grid. */
  private showLevelSelect(focus: Level | SettingChoice): void {
    this.stopRun();
    const levels = this.content.levels;
    const screen = levelSelectScreen(
      levels,
      (id) => this.saves.best(id),
      this.saves.settings,
    );
    this.overlay.show(
      screen,
      (i) => {
        if (i < levels.length) {
          this.showIntro(levels[i]);
        } else {
          const setting = screen.settings[i - levels.length];
          this.changeSetting(setting);
          this.showLevelSelect(setting);
        }
      },
      typeof focus === "string"
        ? levels.length + screen.settings.indexOf(focus)
        : levels.indexOf(focus),
    );
  }

  private changeSetting(setting: SettingChoice): void {
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
  }

  private showIntro(level: Level): void {
    this.phase = "menu";
    this.level = level;
    this.overlay.show(introScreen(level), () => this.start(level));
  }

  private start(level: Level): void {
    const text = buildRunText(level, this.content, Math.random, config.runner);
    if (import.meta.env.DEV) window.__spacetype = { text };
    this.level = level;
    this.engine = new TypingEngine(text, {
      ...config.stream,
      targetSpm: level.targetSpm,
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
    const level = this.level!;
    const stats = engine.stats();
    const stars = starsFor(
      stats.accuracy,
      stats.spm,
      level.targetSpm,
      config.scoring.stars,
    );
    const previous = this.saves.record(level.id, {
      score: stats.score,
      spm: stats.spm,
      accuracy: stats.accuracy,
      stars,
    });
    // A record only counts when there was an earlier result to beat.
    const newRecord =
      previous !== undefined &&
      (stats.score > previous.score || stats.spm > previous.spm);

    const levels = this.content.levels;
    const next = levels[levels.indexOf(level) + 1];
    const screen = resultsScreen({
      level,
      stats,
      stars,
      newRecord,
      confused: confusedKeys(engine.chars),
      hasNext: next !== undefined,
    });
    this.phase = "menu";
    this.celebrate(stars, newRecord);
    this.overlay.show(
      screen,
      (i) => {
        const choice = screen.order[i];
        if (choice === "again") this.showIntro(level);
        else if (choice === "next" && next) this.showIntro(next);
        else this.showLevelSelect(next ?? level);
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
    this.hud.update({
      levelId: this.level!.id,
      score: engine.score,
      combo: engine.combo,
      multiplier: engine.multiplier,
      spm: engine.liveSpm(
        timeMs,
        config.scoring.spmWindowMs,
        config.scoring.spmMinWindowMs,
      ),
      targetSpm: this.level!.targetSpm,
      accuracy: engine.accuracy,
      turbo: engine.turbo ? config.scoring.turbo.multiplier : undefined,
    });
  }
}
