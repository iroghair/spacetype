import type { CharInfo } from "./types";

export interface ComboTier {
  /** Combo length at which this tier starts. */
  combo: number;
  multiplier: number;
}

/** Tier index for a combo: 0 = no tier yet, 1 = first tier, ... */
export function tierFor(combo: number, tiers: readonly ComboTier[]): number {
  let tier = 0;
  tiers.forEach((t, i) => {
    if (combo >= t.combo) tier = i + 1;
  });
  return tier;
}

/** Score multiplier for a combo (1 below the first tier). */
export function multiplierFor(
  combo: number,
  tiers: readonly ComboTier[],
): number {
  const tier = tierFor(combo, tiers);
  return tier === 0 ? 1 : tiers[tier - 1].multiplier;
}

/**
 * Strokes per minute over the last `windowMs` (the live meter).
 * Early in a run the window is shorter (time since start), but never shorter
 * than `minWindowMs`, so two quick strokes don't show as 600 SPM.
 */
export function rollingSpm(
  strokeTimes: readonly number[],
  nowMs: number,
  startMs: number,
  windowMs: number,
  minWindowMs: number,
): number {
  const from = nowMs - windowMs;
  const count = strokeTimes.filter((t) => t > from && t <= nowMs).length;
  const span = Math.max(minWindowMs, Math.min(windowMs, nowMs - startMs));
  return (count / span) * 60_000;
}

export interface StarRule {
  /** Minimum accuracy, 0–1. */
  accuracy: number;
  /** Minimum SPM as a share of the level's target (1 = on target). */
  spmRatio: number;
}

/** 1–3 stars: 3 if the three-star rule is met, 2 for the two-star rule, else 1. */
export function starsFor(
  accuracy: number,
  spm: number,
  targetSpm: number,
  rules: { two: StarRule; three: StarRule },
): 1 | 2 | 3 {
  const meets = (r: StarRule) =>
    accuracy >= r.accuracy && spm >= r.spmRatio * targetSpm;
  if (meets(rules.three)) return 3;
  if (meets(rules.two)) return 2;
  return 1;
}

export interface ConfusedKey {
  expected: string;
  typed: string;
  count: number;
}

/** Wrong strokes grouped by (expected, typed), most frequent first. */
export function confusedKeys(chars: readonly CharInfo[]): ConfusedKey[] {
  const counts = new Map<string, ConfusedKey>();
  for (const c of chars) {
    if (c.state !== "wrong" || c.typed === undefined) continue;
    const key = c.char + "\u0000" + c.typed;
    const entry = counts.get(key) ?? {
      expected: c.char,
      typed: c.typed,
      count: 0,
    };
    entry.count++;
    counts.set(key, entry);
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.expected.localeCompare(b.expected),
  );
}
