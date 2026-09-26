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
    starfield: 0xc8d0ff,
    star: 0xffd34d, // rating stars on the results screen
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

  // How run texts are built from content/nl/levels.json (see engine/levelRunner.ts).
  runner: {
    drillGroup: [2, 4] as [number, number], // letters per drill group
    mixedGroup: [2, 5] as [number, number], // letters per mixed group
    minWords: 6, // fewer usable words than this → mixed drill instead
    focusChance: 0.6, // chance of a word with the level's new keys
    recentWords: 5, // don't repeat any of the last 5 words
  },

  stream: {
    charSpacing: 34, // pixels between flying characters (one "slot")
    startSlots: 10, // where the first character starts, in slots from the laser
    comfortSlots: 10, // typing ahead pulls the next character back to about here
    catchUpRate: 3, // how snappily the stream catches up when typing ahead
  },

  scoring: {
    pointsPerStroke: 10,
    // Combo length → score multiplier. Reaching a tier is celebrated.
    comboTiers: [
      { combo: 10, multiplier: 2 },
      { combo: 25, multiplier: 3 },
      { combo: 50, multiplier: 4 },
      { combo: 100, multiplier: 5 },
    ],
    flawlessWordBonus: 20, // per word without mistakes, times the multiplier
    spmWindowMs: 20_000, // live SPM meter looks at the last 20 seconds
    spmMinWindowMs: 5_000, // ...but at least 5 s, so the start doesn't spike
    // Results screen stars (1 star is always given for finishing).
    stars: {
      two: { accuracy: 0.85, spmRatio: 0.75 },
      three: { accuracy: 0.95, spmRatio: 1 },
    },
    confusedKeysShown: 3, // most-confused keys listed on the results screen
  },

  hud: {
    meterMax: 1.5, // the SPM bar is full at 150% of the level's target
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
