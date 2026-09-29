import Phaser from "phaser";
import { config, cssColor } from "../../config";
import type { TypingEngine } from "../../engine/TypingEngine";
import type { GameEvent } from "../../engine/types";
import { t, type TextKey } from "../../i18n";
import { Bursts } from "../effects/Bursts";
import { Celebrations } from "../effects/Celebrations";
import { Laser } from "../effects/Laser";
import { Starfield } from "../effects/Starfield";
import { createTextures } from "../textures";

// Drawing order, back to front.
const DEPTH = { letters: 10, arrow: 11 }; // particles 15, mascot 20, popups 25

// The play field: starfield, laser, flying letters and effects. It covers the
// whole screen; letters fly in the band between the text panel and the
// finger guide. It draws what the engine says and plays effects for engine
// events; it never decides whether a letter was typed, missed or burned.
export class PlayScene extends Phaser.Scene {
  private engine?: TypingEngine;
  /** Flying letters currently on screen, by character index. */
  private letters = new Map<number, Phaser.GameObjects.Text>();
  /** Every character below this index has already been put on screen once. */
  private spawnedUpTo = 0;
  private arrow!: Phaser.GameObjects.Text;
  private starfield!: Starfield;
  private laser!: Laser;
  private bursts!: Bursts;
  private celebrations!: Celebrations;
  private turbo = false;
  /** Rockets/UFOs/astronauts flying past (a setting; some players find them distracting). */
  private flyBys = true;
  private markReady!: () => void;
  /** Resolves once create() has run and the scene can draw a run. */
  readonly ready = new Promise<void>((resolve) => (this.markReady = resolve));

  constructor() {
    super("Play");
  }

  /** Vertical middle of the letter band. */
  private get centerY(): number {
    return config.layout.fieldTop + config.layout.fieldHeight / 2;
  }

  create(): void {
    createTextures(this);
    this.starfield = new Starfield(this);
    this.laser = new Laser(this);
    this.bursts = new Bursts(this);
    this.celebrations = new Celebrations(this);
    this.arrow = this.add
      .text(0, this.centerY + config.fieldArrow.offsetY, "▲", {
        fontFamily: config.fonts.family,
        fontSize: `${config.fonts.markSize}px`,
        color: cssColor(config.colors.arrow),
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.arrow)
      .setVisible(false);
    this.markReady();
  }

  /** Begin drawing a new run. */
  startRun(engine: TypingEngine): void {
    this.stopRun();
    this.engine = engine;
  }

  /** Clear the field (back to just stars and laser). */
  stopRun(): void {
    for (const letter of this.letters.values()) letter.destroy();
    this.letters.clear();
    this.spawnedUpTo = 0;
    this.engine = undefined;
    this.arrow.setVisible(false);
    this.setTurbo(false);
    this.laser.setColor(config.colors.laserTiers[0]);
  }

  /** Play effects for engine events. */
  handleEvents(events: GameEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case "strokeCorrect":
          this.pop(event.index);
          break;
        case "strokeWrong":
          this.letters
            .get(event.index)
            ?.setColor(cssColor(config.colors.wrong));
          break;
        case "letterMissed":
        case "letterBurned":
          this.burn(event.index);
          break;
        case "comboTier":
          this.tierUp(event.tier);
          break;
        case "comboBroken":
          this.laser.setColor(config.colors.laserTiers[0]);
          break;
        case "turboStart":
          this.celebrations.popup(
            t("celebrate.turbo"),
            config.colors.turboGlow,
          );
          this.setTurbo(true);
          break;
        case "turboEnd":
          this.setTurbo(false);
          break;
      }
    }
  }

  setFlyBys(on: boolean): void {
    this.flyBys = on;
  }

  /** A new personal record: the mascot cheers and something flies by. */
  celebrateRecord(): void {
    this.celebrations.mascotSays(t("celebrate.mascotRecord"));
    if (this.flyBys) this.celebrations.flyBy();
  }

  update(time: number, deltaMs: number): void {
    this.starfield.update(deltaMs);
    this.laser.update(time, deltaMs);
    if (this.engine) {
      this.spawnLetters(this.engine);
      this.moveLetters(this.engine);
      this.moveArrow(this.engine, deltaMs);
    }
  }

  private tierUp(tier: number): void {
    const tiers = config.colors.laserTiers;
    const color = tiers[Math.min(tier, tiers.length - 1)];
    const message = `celebrate.tier${Math.min(tier, 4)}` as TextKey;
    this.celebrations.popup(t(message), color);
    this.laser.setColor(color);
    this.starfield.boostOnce();
    if (this.flyBys) this.celebrations.flyBy();
    if (tier >= 2) this.celebrations.mascotSays(t(message));
  }

  // Turbo: stars streak past and letters glow.
  private setTurbo(on: boolean): void {
    this.turbo = on;
    this.starfield.setTurbo(on);
    for (const letter of this.letters.values()) this.setGlow(letter);
  }

  private setGlow(letter: Phaser.GameObjects.Text): void {
    if (this.turbo)
      letter.setShadow(
        0,
        0,
        cssColor(config.colors.turboGlow),
        14,
        false,
        true,
      );
    else letter.setShadow(0, 0, "#000", 0, false, false);
  }

  /** Screen x of character `index`, from the engine's distance to the laser. */
  private xOf(engine: TypingEngine, index: number): number {
    return config.laser.x + engine.distance(index) * config.stream.charSpacing;
  }

  // Create letters as they come into view from the right.
  private spawnLetters(engine: TypingEngine): void {
    const rightEdge = config.layout.width + config.stream.charSpacing;
    while (
      this.spawnedUpTo < engine.chars.length &&
      this.xOf(engine, this.spawnedUpTo) < rightEdge
    ) {
      const index = this.spawnedUpTo++;
      const info = engine.chars[index];
      // Letters typed before they came into view (typing ahead) are skipped.
      if (info.state === "correct" || info.state === "missed") continue;
      const isSpace = info.char === " ";
      const color =
        info.state === "wrong" ? config.colors.wrong : config.colors.text;
      const letter = this.add
        .text(
          this.xOf(engine, index),
          this.centerY,
          isSpace ? "·" : info.char,
          {
            fontFamily: config.fonts.family,
            fontSize: `${config.fonts.flyingSize}px`,
            color: cssColor(color),
          },
        )
        .setOrigin(0.5)
        .setDepth(DEPTH.letters)
        // Spaces are a faint dot between words.
        .setAlpha(isSpace ? 0.35 : 1);
      this.setGlow(letter);
      this.letters.set(index, letter);
    }
  }

  private moveLetters(engine: TypingEngine): void {
    for (const [index, letter] of this.letters)
      letter.x = this.xOf(engine, index);
  }

  // The arrow glides to the next letter, then moves along with it.
  private moveArrow(engine: TypingEngine, deltaMs: number): void {
    const letter = this.letters.get(engine.cursor);
    if (!letter) {
      this.arrow.setVisible(false);
      return;
    }
    if (!this.arrow.visible) {
      this.arrow.setVisible(true).setX(letter.x);
      return;
    }
    // Close a fixed share of the gap each frame: fast at first, then easing in.
    const share = 1 - Math.exp(-config.fieldArrow.follow * (deltaMs / 1000));
    this.arrow.x += (letter.x - this.arrow.x) * share;
  }

  // Correct: the letter bursts into confetti and pops away.
  private pop(index: number): void {
    const letter = this.letters.get(index);
    if (!letter) return;
    this.letters.delete(index);
    this.bursts.confettiAt(letter.x, letter.y);
    letter.setColor(cssColor(config.colors.correct));
    this.tweens.add({
      targets: letter,
      scale: 1.6,
      alpha: 0,
      duration: config.effects.correctMs,
      ease: "Quad.easeOut",
      onComplete: () => letter.destroy(),
    });
  }

  // Burned at the laser: a fiery burst, the letter flares and fades, the laser flashes.
  private burn(index: number): void {
    const letter = this.letters.get(index);
    this.bursts.fireAt(config.laser.x, this.centerY);
    this.laser.flashOnce();
    if (!letter) return;
    this.letters.delete(index);
    letter.setColor(cssColor(config.colors.burn)).setX(config.laser.x);
    this.tweens.add({
      targets: letter,
      scale: 1.8,
      alpha: 0,
      duration: config.effects.burnMs,
      ease: "Quad.easeOut",
      onComplete: () => letter.destroy(),
    });
  }
}
