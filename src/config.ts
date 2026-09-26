// All game tunables live here. Scenes read from this file instead of using
// numbers of their own, so tuning never means hunting through scene code.

export const config = {
  // Logical game size. Phaser scales this to fit the window (16:9).
  width: 1280,
  height: 720,

  colors: {
    background: 0x05060f,
    star: 0xc8d0ff,
    laserCore: 0xffffff,
    laserGlow: 0xff3b5c,
  },

  starfield: {
    // +1 = stars drift left → right, -1 = right → left.
    direction: 1 as 1 | -1,
    // Each layer is a band of stars; far layers are slower, smaller and dimmer.
    // speed is in pixels per second.
    layers: [
      { count: 90, speed: 6, size: 1.5, alpha: 0.35 },
      { count: 50, speed: 12, size: 2, alpha: 0.5 },
      { count: 20, speed: 20, size: 3, alpha: 0.6 },
    ],
  },

  laser: {
    x: 48, // distance from the left edge
    coreWidth: 3,
    glowWidth: 36,
    glowBands: 6, // more bands = smoother fade
    glowAlpha: 1,
    pulseMs: 1400, // one glow pulse (fade out and back in)
    pulseMinAlpha: 0.35,
  },
};
