import Phaser from "phaser";
import { config } from "../../config";
import { laserOffset } from "../laserMath";

// The laser: a wiggling vertical line from the top to the bottom of the
// screen, with a soft glow. Redrawn every frame.
export class Laser {
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly core: Phaser.GameObjects.Graphics;
  private color: number = config.colors.laserTiers[0];
  /** Extra glow width after a burn; fades back to 0. */
  private flash = 0;
  /** One point every waveStep pixels down the screen, reused every frame. */
  private readonly points: Phaser.Math.Vector2[] = [];

  constructor(scene: Phaser.Scene) {
    this.glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.core = scene.add.graphics();
    const { height } = config.layout;
    for (
      let y = 0;
      y <= height + config.laser.waveStep;
      y += config.laser.waveStep
    ) {
      this.points.push(new Phaser.Math.Vector2(config.laser.x, y));
    }
  }

  setColor(color: number): void {
    this.color = color;
  }

  /** Briefly widen the glow (something burned). */
  flashOnce(): void {
    this.flash = 1;
  }

  update(timeMs: number, deltaMs: number): void {
    const { laser, layout } = config;
    const wave = {
      periods: laser.wavePeriods,
      amplitude: laser.waveAmplitude,
      travelMs: laser.waveTravelMs,
      breatheMs: laser.waveBreatheMs,
    };
    const points = this.points;
    for (const p of points)
      p.x = laser.x + laserOffset(p.y, layout.height, timeMs, wave);

    // Glow pulse: alpha swings between pulseMinAlpha and 1.
    const pulse = 0.5 + 0.5 * Math.cos((2 * Math.PI * timeMs) / laser.pulseMs);
    const alpha = laser.pulseMinAlpha + (1 - laser.pulseMinAlpha) * pulse;
    this.flash = Math.max(0, this.flash - deltaMs / config.effects.burnMs);
    const width = laser.glowWidth * (1 + (laser.flashWidth - 1) * this.flash);

    // Same trick as before: several bands, each narrower than the last; where
    // they overlap in the middle the colour adds up, so it fades to the sides.
    this.glow.clear();
    for (let i = 1; i <= laser.glowBands; i++) {
      this.glow.lineStyle(
        (width * i) / laser.glowBands,
        this.color,
        alpha / laser.glowBands,
      );
      this.glow.strokePoints(points, false);
    }
    this.core.clear();
    this.core.lineStyle(laser.coreWidth, config.colors.laserCore, 1);
    this.core.strokePoints(points, false);
  }
}
