import Phaser from "phaser";
import { config } from "../../config";
import { driftX } from "../starMath";
import { TEX } from "../textures";

interface Star {
  image: Phaser.GameObjects.Image;
  speed: number;
  size: number;
}

// Slowly drifting stars over the whole screen. They can briefly speed up
// (tier-up) or streak past (turbo).
export class Starfield {
  private readonly stars: Star[] = [];
  private boost = 0; // 0-1, fades out after a tier-up
  private turbo = false;
  private speedFactor = 1; // eased towards its target so changes are smooth
  private lastStretch = 1;

  constructor(scene: Phaser.Scene) {
    for (const layer of config.starfield.layers) {
      for (let i = 0; i < layer.count; i++) {
        const image = scene.add
          .image(
            Phaser.Math.Between(0, config.layout.width),
            Phaser.Math.Between(0, config.layout.height),
            TEX.dot,
          )
          .setTint(config.colors.starfield)
          .setAlpha(layer.alpha)
          // The texture is 8 px wide, so scale = size / 8 gives a dot `size` px across.
          .setScale(layer.size / 8);
        this.stars.push({ image, speed: layer.speed, size: layer.size });
      }
    }
  }

  /** Short burst of speed (combo tier-up). */
  boostOnce(): void {
    this.boost = 1;
  }

  setTurbo(on: boolean): void {
    this.turbo = on;
  }

  update(deltaMs: number): void {
    const { effects, starfield, layout } = config;
    this.boost = Math.max(0, this.boost - deltaMs / effects.starBoostMs);
    const target = this.turbo
      ? effects.turboStarSpeed
      : 1 + (effects.starBoost - 1) * this.boost;
    // Ease 10% of the way per frame-ish, so speeding up and slowing down look smooth.
    this.speedFactor +=
      (target - this.speedFactor) * Math.min(1, deltaMs / 100);
    // Faster stars stretch into streaks.
    const stretch = 1 + (this.speedFactor - 1) * 0.6;

    // Rescaling every star is not free, so only do it while the stretch changes.
    const rescale = Math.abs(stretch - this.lastStretch) > 0.01;
    if (rescale) this.lastStretch = stretch;
    for (const star of this.stars) {
      star.image.x = driftX(
        star.image.x,
        star.speed * this.speedFactor,
        starfield.direction,
        deltaMs,
        layout.width,
      );
      if (rescale)
        star.image.setScale((star.size / 8) * stretch, star.size / 8);
    }
  }
}
