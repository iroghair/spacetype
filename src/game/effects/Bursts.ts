import Phaser from "phaser";
import { config } from "../../config";
import { TEX } from "../textures";

// Particle bursts: confetti for a correct letter, fire for a burned one.
// Each emitter has a hard cap on live particles (see config.effects).
export class Bursts {
  private readonly confetti: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly fire: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    const c = config.effects.confetti;
    this.confetti = scene.add.particles(0, 0, TEX.confetti, {
      emitting: false,
      lifespan: c.lifespanMs,
      speed: { min: 120, max: 340 },
      angle: { min: 200, max: 340 }, // upwards fan
      gravityY: 600,
      rotate: { min: 0, max: 360 },
      scale: { min: 0.6, max: 1.1 },
      alpha: { start: 1, end: 0 },
      tint: [...config.colors.confetti],
      maxAliveParticles: c.maxAlive,
    });
    this.confetti.setDepth(15);

    const f = config.effects.fire;
    this.fire = scene.add.particles(0, 0, TEX.spark, {
      emitting: false,
      lifespan: { min: f.lifespanMs * 0.5, max: f.lifespanMs },
      speed: { min: 60, max: 260 },
      angle: { min: 0, max: 360 },
      gravityY: -120, // fire rises
      scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [...config.colors.fire],
      blendMode: Phaser.BlendModes.ADD,
      maxAliveParticles: f.maxAlive,
    });
    this.fire.setDepth(15);
  }

  confettiAt(x: number, y: number): void {
    this.confetti.explode(config.effects.confetti.perBurst, x, y);
  }

  fireAt(x: number, y: number): void {
    this.fire.explode(config.effects.fire.perBurst, x, y);
  }
}
