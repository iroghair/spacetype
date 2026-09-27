// All game tunables live here. Scenes and UI read from this file instead of
// using numbers of their own, so tuning never means hunting through the code.

const layout = {
  width: 1280,
  height: 720,
  hudHeight: 48,
  panelHeight: 216,
  panelWidth: 1000, // the text panel box, centred, clear of the laser
  fieldHeight: 216, // the band where letters fly
  // The rest (720 - 48 - 216 - 216 = 240) is the finger guide.
};

export const config = {
  // The whole screen is laid out on a fixed 1280×720 "stage" that is scaled
  // to fit the window, so these pixel sizes are in stage pixels. The Phaser
  // canvas covers the whole stage (stars and laser run top to bottom); the
  // HUD, text panel and finger guide sit on top of it.
  layout: {
    ...layout,
    fieldTop: layout.hudHeight + layout.panelHeight, // y where the letter band starts
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
    // Laser glow per combo tier: no tier, then tiers 1-4.
    laserTiers: [0xff3b5c, 0xff8a3b, 0xffd34d, 0x5ee07a, 0x4dd9ff],
    burn: 0xff8a3b,
    turboGlow: 0x4dd9ff,
    // Confetti for correct letters.
    confetti: [0xff5a5a, 0xffd34d, 0x5ee07a, 0x4dd9ff, 0xc792ea, 0xff9ff3],
    // Fire for burned letters.
    fire: [0xffffff, 0xffd34d, 0xff8a3b, 0xff3b5c],
    // Finger guide: one colour per finger, the same on both hands.
    fingers: {
      pinky: 0xc792ea,
      ring: 0x82aaff,
      middle: 0x5ee0a0,
      index: 0xffcb6b,
      thumb: 0xf78c6c,
    },
  },

  fonts: {
    family: "Atkinson Hyperlegible Mono",
    panelSize: 32, // letters in the text panel
    markSize: 18, // the small wrong-key marks above letters
    flyingSize: 44, // letters in the play field
    popupSize: 56, // "Super!" etc.
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
    // Turbo: live SPM at least `ratio` × target for `holdMs` → points × `multiplier`.
    turbo: { ratio: 1.2, holdMs: 10_000, multiplier: 2 },
    // Results screen stars (1 star is always given for finishing).
    stars: {
      two: { accuracy: 0.85, spmRatio: 0.75 },
      three: { accuracy: 0.95, spmRatio: 1 },
    },
    confusedKeysShown: 3, // most-confused keys listed on the results screen
  },

  guide: {
    unit: 30, // size of one letter key, in pixels
    gap: 3, // space between keys
    handHeight: 62, // height of the hands below the keyboard
    bottomMargin: 10, // free space below the hands
    handGap: 20, // space between the two hands
  },

  hud: {
    meterMax: 1.5, // the SPM bar is full at 150% of the level's target
  },

  panel: {
    maxLineChars: 42,
    arrowSlideMs: 120, // arrow tween between letters
  },

  fieldArrow: {
    offsetY: 34, // how far below the letter centre the arrow sits
    follow: 18, // how quickly it glides to a new letter (higher = faster)
  },

  effects: {
    correctMs: 300, // a correct letter pops and fades
    burnMs: 350, // a burned letter flares and fades
    // Particle caps keep the frame rate steady: a burst never adds more than
    // `perBurst` particles, and no more than `maxAlive` exist at once.
    confetti: { perBurst: 14, maxAlive: 260, lifespanMs: 900 },
    fire: { perBurst: 22, maxAlive: 220, lifespanMs: 600 },
    popupMs: 1100, // "Super!" text on screen
    starBoost: 12, // stars move this many times faster right after a tier-up...
    starBoostMs: 1500, // ...slowing back down over this long
    turboStarSpeed: 10, // star speed multiplier during turbo (with streaks)
    flyByMs: 3200, // time for a rocket/UFO/astronaut to cross the screen
    mascotMs: 2400, // how long the mascot stays up
  },

  celebration: {
    // Big canvas-confetti fireworks at level end and for records.
    levelCompleteBursts: 5,
    recordBursts: 10,
    burstIntervalMs: 350,
    particlesPerBurst: 70,
    starDelayMs: 350, // results screen: time between stars popping in
  },

  audio: {
    volume: 0.6, // default volume, 0-1
    volumeSteps: [0.25, 0.5, 0.75, 1], // the volume button cycles through these
    correctBaseHz: 520, // pitch of a correct stroke with no combo...
    correctOctaves: 1.5, // ...rising this many octaves...
    correctComboForTop: 60, // ...when the combo reaches this
    musicVolume: 0.35, // music is quieter than the effects
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
      { count: 60, speed: 6, size: 1.5, alpha: 0.35 },
      { count: 34, speed: 12, size: 2, alpha: 0.5 },
      { count: 14, speed: 20, size: 3, alpha: 0.6 },
    ],
  },

  laser: {
    x: 48, // centre line, distance from the left edge
    coreWidth: 3,
    glowWidth: 36,
    glowBands: 4, // more bands = smoother fade (and more drawing work)
    pulseMs: 1400, // one glow pulse (fade out and back in)
    pulseMinAlpha: 0.35,
    // The laser wiggles like a sine wave drawn top to bottom:
    wavePeriods: 12, // number of waves over the screen height
    waveAmplitude: 9, // pixels, at the widest
    waveTravelMs: 6000, // time for a peak to move down one wavelength
    waveBreatheMs: 4000, // amplitude swings +1 → -1 → +1 in this time
    waveStep: 8, // pixels between drawn points (smaller = smoother, but slower)
    flashWidth: 1.8, // glow widens this much when something burns
  },
};

/** 0xff5a5a → "#ff5a5a", for CSS. */
export function cssColor(color: number): string {
  return "#" + color.toString(16).padStart(6, "0");
}
