// Saved data: personal bests per level, on this device only (localStorage).
// The data carries a version number, so a future format change can convert
// or reset old data instead of crashing on it.

const KEY = "spacetype";
const VERSION = 1;

export interface LevelBest {
  score: number;
  spm: number;
  accuracy: number;
  stars: number;
}

export interface Settings {
  /** Show the on-screen keyboard and hands. */
  fingerGuide: boolean;
  /** Sound effects on. */
  sound: boolean;
  /** 0-1 */
  volume: number;
  /** Background music on (off by default). */
  music: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  fingerGuide: true,
  sound: true,
  volume: 0.5,
  music: false,
};

export interface SaveData {
  version: typeof VERSION;
  bests: Record<string, LevelBest>;
  /** Added in phase 4; older saves don't have it yet. */
  settings?: Partial<Settings>;
}

function empty(): SaveData {
  return { version: VERSION, bests: {} };
}

/** The part of the browser's Storage we use (so tests can pass a fake). */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

export class SaveStore {
  private data: SaveData;

  constructor(private readonly store: KeyValueStore) {
    this.data = this.load();
  }

  get settings(): Settings {
    return { ...DEFAULT_SETTINGS, ...this.data.settings };
  }

  updateSettings(changes: Partial<Settings>): void {
    this.data.settings = { ...this.data.settings, ...changes };
    this.save();
  }

  /** Best result for a level ("3") or topic run ("topic-vissen-2"). */
  best(key: string): LevelBest | undefined {
    return this.data.bests[key];
  }

  /**
   * Record a finished run. Each field keeps its own best, so a fast-but-sloppy
   * run can set the SPM record while an earlier run keeps the accuracy record.
   * Returns the previous best (undefined on the first run of this level).
   */
  record(key: string, run: LevelBest): LevelBest | undefined {
    const previous = this.data.bests[key];
    this.data.bests[key] = previous
      ? {
          score: Math.max(previous.score, run.score),
          spm: Math.max(previous.spm, run.spm),
          accuracy: Math.max(previous.accuracy, run.accuracy),
          stars: Math.max(previous.stars, run.stars),
        }
      : { ...run };
    this.save();
    return previous;
  }

  private load(): SaveData {
    try {
      const raw = this.store.getItem(KEY);
      if (!raw) return empty();
      const parsed = JSON.parse(raw);
      if (parsed?.version !== VERSION || typeof parsed.bests !== "object")
        return empty();
      return parsed as SaveData;
    } catch {
      // Storage blocked (private mode) or corrupt data: start fresh.
      return empty();
    }
  }

  private save(): void {
    try {
      this.store.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Storage full or blocked: the game still works, bests just aren't kept.
    }
  }
}
