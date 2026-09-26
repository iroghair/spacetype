import Phaser from "phaser";
import { config, cssColor } from "../../config";
import type { TypingEngine } from "../../engine/TypingEngine";
import type { GameEvent } from "../../engine/types";
import { driftX } from "../starMath";

interface Star {
  image: Phaser.GameObjects.Image;
  speed: number;
}

// The play field: starfield, laser and the flying letters.
// It draws what the engine says and plays effects for engine events; it never
// decides whether a letter was typed, missed or burned.
export class PlayScene extends Phaser.Scene {
  private stars: Star[] = [];
  private engine?: TypingEngine;
  /** Flying letters currently on screen, by character index. */
  private letters = new Map<number, Phaser.GameObjects.Text>();
  /** Every character below this index has already been put on screen once. */
  private spawnedUpTo = 0;
  private arrow!: Phaser.GameObjects.Text;
  private laserGlow!: Phaser.GameObjects.Container;
  private markReady!: () => void;
  /** Resolves once create() has run and the scene can draw a run. */
  readonly ready = new Promise<void>((resolve) => (this.markReady = resolve));

  constructor() {
    super("Play");
  }

  private get centerY(): number {
    return config.layout.fieldHeight / 2;
  }

  create(): void {
    this.createStarTexture();
    this.createStars();
    this.createLaser();
    this.arrow = this.add
      .text(0, this.centerY + config.fieldArrow.offsetY, "▲", {
        fontFamily: config.fonts.family,
        fontSize: `${config.fonts.markSize}px`,
        color: cssColor(config.colors.arrow),
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.markReady();
  }

  /** Begin drawing a new run. */
  startRun(engine: TypingEngine): void {
    for (const letter of this.letters.values()) letter.destroy();
    this.letters.clear();
    this.spawnedUpTo = 0;
    this.engine = engine;
    this.arrow.setVisible(false);
  }

  /** Play effects for engine events. */
  handleEvents(events: GameEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case "strokeCorrect":
          this.burst(event.index);
          break;
        case "strokeWrong": {
          const letter = this.letters.get(event.index);
          letter?.setColor(cssColor(config.colors.wrong));
          break;
        }
        case "letterMissed":
        case "letterBurned":
          this.burn(event.index);
          break;
      }
    }
  }

  update(_time: number, deltaMs: number): void {
    const { direction } = config.starfield;
    for (const star of this.stars) {
      star.image.x = driftX(
        star.image.x,
        star.speed,
        direction,
        deltaMs,
        config.layout.width,
      );
    }
    if (this.engine) {
      this.spawnLetters(this.engine);
      this.moveLetters(this.engine);
      this.moveArrow(this.engine, deltaMs);
    }
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
        // Spaces are a faint dot between words.
        .setAlpha(isSpace ? 0.35 : 1);
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
    const t = 1 - Math.exp(-config.fieldArrow.follow * (deltaMs / 1000));
    this.arrow.x += (letter.x - this.arrow.x) * t;
  }

  // Placeholder "confetti": the letter turns green, floats up and fades (real effect in phase 5).
  private burst(index: number): void {
    const letter = this.letters.get(index);
    if (!letter) return;
    this.letters.delete(index);
    letter.setColor(cssColor(config.colors.correct));
    this.tweens.add({
      targets: letter,
      y: letter.y - 30,
      scale: 1.5,
      alpha: 0,
      duration: config.effects.correctMs,
      ease: "Quad.easeOut",
      onComplete: () => letter.destroy(),
    });
  }

  // Placeholder burn: the letter flares orange at the laser and fades; the laser flashes.
  private burn(index: number): void {
    const letter = this.letters.get(index);
    if (letter) {
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
    this.laserGlow.setScale(1.8, 1);
    this.tweens.add({
      targets: this.laserGlow,
      scaleX: 1,
      duration: config.effects.burnMs,
      ease: "Quad.easeOut",
    });
  }

  // One small white dot texture, drawn once and reused (tinted/scaled) by every star.
  private createStarTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("star", 8, 8);
    g.destroy();
  }

  private createStars(): void {
    for (const layer of config.starfield.layers) {
      for (let i = 0; i < layer.count; i++) {
        const image = this.add
          .image(
            Phaser.Math.Between(0, config.layout.width),
            Phaser.Math.Between(0, config.layout.fieldHeight),
            "star",
          )
          .setTint(config.colors.star)
          .setAlpha(layer.alpha)
          // Texture is 8 px wide, so scale = size / 8 gives a dot `size` px across.
          .setScale(layer.size / 8);
        this.stars.push({ image, speed: layer.speed });
      }
    }
  }

  private createLaser(): void {
    const { laser, colors } = config;
    const height = config.layout.fieldHeight;

    // Soft glow: several centred bands, each narrower than the last. Where they
    // overlap (near the centre) the colour adds up, so it fades out to the sides.
    this.laserGlow = this.add.container(laser.x, 0).setAlpha(laser.glowAlpha);
    for (let i = 1; i <= laser.glowBands; i++) {
      const width = (laser.glowWidth * i) / laser.glowBands;
      const band = this.add
        .rectangle(0, 0, width, height, colors.laserGlow, 1 / laser.glowBands)
        .setOrigin(0.5, 0)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.laserGlow.add(band);
    }
    this.add
      .rectangle(laser.x, 0, laser.coreWidth, height, colors.laserCore)
      .setOrigin(0.5, 0);

    // Gentle pulse so the laser feels "on".
    this.tweens.add({
      targets: this.laserGlow,
      alpha: laser.pulseMinAlpha,
      duration: laser.pulseMs / 2,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}
