import confetti from "canvas-confetti";
import { config, cssColor } from "../config";

// Big full-screen fireworks (canvas-confetti) for level complete and records.
// Drawn on its own canvas on top of everything; it never blocks clicks.
export class Fireworks {
  private readonly fire;
  private timer?: number;

  constructor(canvas: HTMLCanvasElement) {
    // disableForReducedMotion: players who asked their system for less motion get none.
    this.fire = confetti.create(canvas, {
      resize: true,
      useWorker: false,
      disableForReducedMotion: true,
    });
  }

  /** `bursts` fireworks at random spots, one every burstIntervalMs. */
  show(
    bursts: number,
    shapes: ("square" | "circle" | "star")[] = ["square", "circle"],
  ): void {
    const { burstIntervalMs, particlesPerBurst } = config.celebration;
    const colors = config.colors.confetti.map(cssColor);
    window.clearInterval(this.timer);
    let left = bursts;
    const one = () => {
      void this.fire({
        particleCount: particlesPerBurst,
        spread: 360,
        startVelocity: 32,
        ticks: 90,
        gravity: 0.7,
        origin: {
          x: 0.15 + Math.random() * 0.7,
          y: 0.15 + Math.random() * 0.35,
        },
        colors,
        shapes,
      });
      if (--left <= 0) window.clearInterval(this.timer);
    };
    one();
    if (left > 0) this.timer = window.setInterval(one, burstIntervalMs);
  }

  stop(): void {
    window.clearInterval(this.timer);
    this.fire.reset();
  }
}
