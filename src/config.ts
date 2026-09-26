// All game tunables live here. Scenes and UI read from this file instead of
// using numbers of their own, so tuning never means hunting through the code.

export const config = {
  // The whole screen is laid out on a fixed 1280×720 "stage" that is scaled
  // to fit the window, so these pixel sizes are in stage pixels.
  layout: {
    width: 1280,
    height: 720,
    hudHeight: 48,
    panelHeight: 240,
    fieldHeight: 232, // the Phaser play field
    // The rest (720 - 48 - 240 - 232 = 200) is kept free for the finger guide (phase 4).
  },

  colors: {
    background: 0x05060f,
    panelBackground: 0x0b0d1f,
    text: 0xe8ecff,
    textDim: 0x8a90b8,
    correct: 0x5ee07a,
    wrong: 0xff5a5a,
    arrow: 0x4dd9ff,
    star: 0xc8d0ff,
    laserCore: 0xffffff,
    laserGlow: 0xff3b5c,
    burn: 0xff8a3b,
  },

  fonts: {
    family: "Atkinson Hyperlegible Mono",
    panelSize: 34, // letters in the text panel
    markSize: 20, // the small wrong-key marks above letters
    flyingSize: 44, // letters in the play field
  },

  // Temporary until levels.json arrives in phase 3.
  testLevel: {
    targetSpm: 30,
  },

  stream: {
    charSpacing: 34, // pixels between flying characters (one "slot")
    startSlots: 10, // where the first character starts, in slots from the laser
    comfortSlots: 10, // typing ahead pulls the next character back to about here
    catchUpRate: 3, // how snappily the stream catches up when typing ahead
  },

  scoring: {
    pointsPerStroke: 10,
  },

  panel: {
    maxLineChars: 48,
    arrowSlideMs: 120, // arrow tween between letters
  },

  fieldArrow: {
    offsetY: 34, // how far below the letter centre the arrow sits
    follow: 18, // how quickly it glides to a new letter (higher = faster)
  },

  effects: {
    correctMs: 300,
    burnMs: 350,
  },

  ui: {
    completeDelayMs: 1200, // pause between the last letter and the "level complete" box
  },

  starfield: {
    // +1 = stars drift left → right, -1 = right → left.
    direction: 1 as 1 | -1,
    // Each layer is a band of stars; far layers are slower, smaller and dimmer.
    // speed is in pixels per second.
    layers: [
      { count: 30, speed: 6, size: 1.5, alpha: 0.35 },
      { count: 18, speed: 12, size: 2, alpha: 0.5 },
      { count: 8, speed: 20, size: 3, alpha: 0.6 },
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

/** 0xff5a5a → "#ff5a5a", for CSS. */
export function cssColor(color: number): string {
  return "#" + color.toString(16).padStart(6, "0");
}
