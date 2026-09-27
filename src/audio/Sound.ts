import { config } from "../config";
import type { GameEvent } from "../engine/types";

// Sound effects and an optional music loop, all synthesised with the Web
// Audio API: no sound files to download or license. Driven by engine events.
//
// Browsers only allow audio after the player has interacted with the page,
// so nothing plays until unlock() is called from the first key press.

type Wave = OscillatorType;

export class Sound {
  private ctx?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private musicTimer?: number;
  private nextMusicTime = 0;
  private musicStep = 0;
  private enabled = true;
  private volume: number = config.audio.volume;
  private music = false;

  /** Create/resume the audio system. Safe to call on every key press. */
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = config.audio.musicVolume;
      this.musicGain.connect(this.master);
      this.applyVolume();
      if (this.music) this.startMusic();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.applyVolume();
  }

  setVolume(volume: number): void {
    this.volume = volume;
    this.applyVolume();
  }

  setMusic(on: boolean): void {
    this.music = on;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  /** Play the sounds for a batch of engine events. */
  handleEvents(events: GameEvent[], combo: number): void {
    for (const event of events) {
      switch (event.type) {
        case "strokeCorrect":
          this.correct(combo);
          break;
        case "strokeWrong":
          this.wrong();
          break;
        case "letterMissed":
        case "letterBurned":
          this.burn();
          break;
        case "comboTier":
          this.tierUp(event.tier);
          break;
        case "turboStart":
          this.turbo();
          break;
      }
    }
  }

  /** Short blip; the higher the combo, the higher the pitch. */
  correct(combo: number): void {
    const { correctBaseHz, correctOctaves, correctComboForTop } = config.audio;
    const rise = Math.min(combo, correctComboForTop) / correctComboForTop;
    this.tone(
      correctBaseHz * 2 ** (rise * correctOctaves),
      0.07,
      "triangle",
      0.25,
    );
  }

  wrong(): void {
    this.tone(150, 0.14, "square", 0.12, 110);
  }

  /** A whoosh: filtered noise sweeping down. */
  burn(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2400, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    const gain = this.envelope(ctx, t, 0.3, 0.3);
    noise.connect(filter).connect(gain).connect(this.master!);
    noise.start(t);
  }

  /** Quick rising arpeggio; higher tiers start higher. */
  tierUp(tier: number): void {
    const base = 440 * 2 ** ((tier - 1) / 6);
    [1, 1.25, 1.5, 2].forEach((ratio, i) =>
      this.tone(base * ratio, 0.12, "triangle", 0.25, undefined, i * 0.07),
    );
  }

  /** Engine revving up. */
  turbo(): void {
    this.tone(200, 0.45, "sawtooth", 0.12, 1200);
  }

  /** Little fanfare. */
  levelComplete(): void {
    const notes = [523, 659, 784, 659, 784, 1047];
    notes.forEach((hz, i) =>
      this.tone(
        hz,
        i === notes.length - 1 ? 0.5 : 0.14,
        "triangle",
        0.28,
        undefined,
        i * 0.13,
      ),
    );
  }

  /** Sparkly run up and a long high note. */
  record(): void {
    for (let i = 0; i < 10; i++)
      this.tone(660 * 2 ** (i / 8), 0.08, "sine", 0.2, undefined, i * 0.05);
    this.tone(1320, 0.8, "triangle", 0.25, undefined, 0.55);
  }

  /** A soft tick for each star on the results screen. */
  star(index: number): void {
    this.tone(880 * 2 ** (index / 4), 0.18, "sine", 0.3);
  }

  // ---------- building blocks ----------

  /** The context, if audio is unlocked and switched on. */
  private ready(): AudioContext | undefined {
    return this.ctx && this.enabled ? this.ctx : undefined;
  }

  private applyVolume(): void {
    if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
  }

  /** A gain node that fades in quickly and out over `seconds`. */
  private envelope(
    ctx: AudioContext,
    start: number,
    seconds: number,
    peak: number,
  ): GainNode {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    return gain;
  }

  /** One note. If `endHz` is given the pitch slides there. */
  private tone(
    hz: number,
    seconds: number,
    wave: Wave,
    peak: number,
    endHz?: number,
    delay = 0,
    out?: AudioNode,
  ): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, t);
    if (endHz) osc.frequency.exponentialRampToValueAtTime(endHz, t + seconds);
    osc
      .connect(this.envelope(ctx, t, seconds, peak))
      .connect(out ?? this.master!);
    osc.start(t);
    osc.stop(t + seconds + 0.05);
  }

  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const buffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * seconds),
      ctx.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // ---------- music ----------

  // A calm spacey loop: a slow arpeggio over four chords. Notes are scheduled
  // a little ahead of time so the timer's jitter can't be heard.
  private static readonly CHORDS = [
    [220, 262, 330, 392], // Am7
    [175, 220, 262, 330], // Fmaj7
    [196, 247, 294, 392], // G
    [165, 196, 247, 330], // Em7
  ];
  private static readonly STEP_S = 0.3;

  private startMusic(): void {
    if (!this.ctx || this.musicTimer !== undefined) return;
    this.nextMusicTime = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 100);
  }

  private stopMusic(): void {
    window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
  }

  private scheduleMusic(): void {
    const ctx = this.ready();
    if (!ctx) return;
    while (this.nextMusicTime < ctx.currentTime + 0.5) {
      const chord =
        Sound.CHORDS[Math.floor(this.musicStep / 16) % Sound.CHORDS.length];
      const note = chord[[0, 1, 2, 3, 2, 1][this.musicStep % 6]] * 2;
      const delay = this.nextMusicTime - ctx.currentTime;
      this.tone(note, 0.9, "sine", 0.18, undefined, delay, this.musicGain);
      // A low pad note at the start of each chord.
      if (this.musicStep % 16 === 0)
        this.tone(
          chord[0] / 2,
          Sound.STEP_S * 16,
          "sine",
          0.2,
          undefined,
          delay,
          this.musicGain,
        );
      this.nextMusicTime += Sound.STEP_S;
      this.musicStep++;
    }
  }
}
