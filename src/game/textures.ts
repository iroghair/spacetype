import Phaser from "phaser";

// All sprites are drawn in code once at startup (original artwork, no files
// to license). Each function draws with a Graphics object and saves the
// result as a named texture.

export const TEX = {
  dot: "dot",
  confetti: "confetti",
  spark: "spark",
  rocket: "rocket",
  ufo: "ufo",
  astronaut: "astronaut",
  mascot: "mascot",
} as const;

function draw(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  paint: (g: Phaser.GameObjects.Graphics) => void,
) {
  const g = scene.add.graphics();
  paint(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function createTextures(scene: Phaser.Scene): void {
  // Small white dot for stars (tinted and scaled per star).
  draw(scene, TEX.dot, 8, 8, (g) => g.fillStyle(0xffffff).fillCircle(4, 4, 4));

  // A confetti strip (tinted per particle).
  draw(scene, TEX.confetti, 6, 10, (g) =>
    g.fillStyle(0xffffff).fillRect(0, 0, 6, 10),
  );

  // A soft spark for fire: bright centre fading out.
  draw(scene, TEX.spark, 16, 16, (g) => {
    for (let r = 8; r > 0; r--)
      g.fillStyle(0xffffff, 0.12 + (1 - r / 8) * 0.5).fillCircle(8, 8, r);
  });

  // Rocket, pointing right, with a flame at the back.
  draw(scene, TEX.rocket, 96, 44, (g) => {
    g.fillStyle(0xff8a3b).fillTriangle(0, 14, 0, 30, 18, 22); // flame
    g.fillStyle(0xffd34d).fillTriangle(6, 17, 6, 27, 16, 22);
    g.fillStyle(0xe8ecff).fillRoundedRect(16, 12, 56, 20, 8); // body
    g.fillStyle(0xff3b5c).fillTriangle(72, 12, 72, 32, 94, 22); // nose
    g.fillStyle(0xff3b5c).fillTriangle(18, 12, 34, 12, 18, 0); // fins
    g.fillStyle(0xff3b5c).fillTriangle(18, 32, 34, 32, 18, 44);
    g.fillStyle(0x4dd9ff).fillCircle(52, 22, 6); // window
    g.lineStyle(2, 0x0b0d1f).strokeCircle(52, 22, 6);
  });

  // Flying saucer with a glass dome and lights.
  draw(scene, TEX.ufo, 96, 52, (g) => {
    g.fillStyle(0x4dd9ff, 0.7).fillEllipse(48, 20, 40, 32); // dome
    g.fillStyle(0x8a90b8).fillEllipse(48, 32, 92, 24); // saucer
    g.fillStyle(0xc8d0ff).fillEllipse(48, 28, 80, 10);
    for (const x of [18, 36, 60, 78])
      g.fillStyle(0xffd34d).fillCircle(x, 36, 3.5);
    g.fillStyle(0x5ee07a).fillCircle(48, 18, 5); // a tiny green pilot
  });

  // Astronaut floating: helmet, visor, body, backpack.
  draw(scene, TEX.astronaut, 60, 76, (g) => {
    g.fillStyle(0xb8bedc).fillRoundedRect(4, 30, 12, 30, 5); // backpack
    g.fillStyle(0xe8ecff).fillRoundedRect(12, 30, 36, 34, 12); // body
    g.fillStyle(0xe8ecff).fillRoundedRect(4, 34, 10, 22, 5); // arms
    g.fillStyle(0xe8ecff).fillRoundedRect(46, 34, 10, 22, 5);
    g.fillStyle(0xe8ecff).fillRoundedRect(16, 60, 11, 16, 5); // legs
    g.fillStyle(0xe8ecff).fillRoundedRect(33, 60, 11, 16, 5);
    g.fillStyle(0xe8ecff).fillCircle(30, 20, 18); // helmet
    g.fillStyle(0x4dd9ff).fillRoundedRect(17, 12, 26, 16, 8); // visor
    g.fillStyle(0xffffff, 0.8).fillCircle(24, 16, 3); // shine
    g.fillStyle(0xff3b5c).fillRect(24, 40, 12, 6); // badge
  });

  // The mascot: a friendly round robot with an antenna.
  draw(scene, TEX.mascot, 84, 100, (g) => {
    g.lineStyle(4, 0x8a90b8).lineBetween(42, 8, 42, 22); // antenna
    g.fillStyle(0xffd34d).fillCircle(42, 7, 6);
    g.fillStyle(0x82aaff).fillRoundedRect(8, 20, 68, 52, 20); // head
    g.fillStyle(0x0b0d1f).fillRoundedRect(16, 30, 52, 30, 12); // face screen
    g.fillStyle(0x5ee0a0).fillCircle(31, 42, 6); // eyes
    g.fillStyle(0x5ee0a0).fillCircle(53, 42, 6);
    g.lineStyle(4, 0x5ee0a0)
      .beginPath()
      .arc(42, 46, 11, 0.2 * Math.PI, 0.8 * Math.PI)
      .strokePath(); // smile
    g.fillStyle(0x82aaff).fillRoundedRect(22, 74, 40, 22, 10); // body
    g.fillStyle(0xff8a3b).fillCircle(42, 85, 5); // button
  });
}
