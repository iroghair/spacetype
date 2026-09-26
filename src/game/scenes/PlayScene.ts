import Phaser from "phaser";
import { config } from "../../config";
import { driftX } from "../starMath";

interface Star {
  image: Phaser.GameObjects.Image;
  speed: number;
}

// Placeholder play scene for phase 1: dark space, drifting stars and the laser.
export class PlayScene extends Phaser.Scene {
  private stars: Star[] = [];

  constructor() {
    super("Play");
  }

  create(): void {
    this.createStarTexture();
    this.createStars();
    this.createLaser();
  }

  update(_time: number, deltaMs: number): void {
    const { direction } = config.starfield;
    for (const star of this.stars) {
      star.image.x = driftX(
        star.image.x,
        star.speed,
        direction,
        deltaMs,
        config.width,
      );
    }
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
            Phaser.Math.Between(0, config.width),
            Phaser.Math.Between(0, config.height),
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
    const { laser, colors, height } = config;

    // Soft glow: several centred bands, each narrower than the last. Where they
    // overlap (near the centre) the colour adds up, so it fades out to the sides.
    const glow = this.add.container(laser.x, 0).setAlpha(laser.glowAlpha);
    for (let i = 1; i <= laser.glowBands; i++) {
      const width = (laser.glowWidth * i) / laser.glowBands;
      const band = this.add
        .rectangle(0, 0, width, height, colors.laserGlow, 1 / laser.glowBands)
        .setOrigin(0.5, 0)
        .setBlendMode(Phaser.BlendModes.ADD);
      glow.add(band);
    }
    this.add
      .rectangle(laser.x, 0, laser.coreWidth, height, colors.laserCore)
      .setOrigin(0.5, 0);

    // Gentle pulse so the laser feels "on".
    this.tweens.add({
      targets: glow,
      alpha: laser.pulseMinAlpha,
      duration: laser.pulseMs / 2,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}
