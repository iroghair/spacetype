import { describe, expect, it } from "vitest";
import { laserOffset, type WaveOptions } from "../../src/game/laserMath";

const wave: WaveOptions = {
  periods: 12,
  amplitude: 10,
  travelMs: 6000,
  breatheMs: 4000,
};
const H = 720;
// A quarter of the breathe cycle: amplitude is at its +1 maximum.
const T = 1000;

describe("laserOffset", () => {
  it("never swings wider than the amplitude", () => {
    for (let y = 0; y <= H; y += 7) {
      for (let t = 0; t < 8000; t += 333) {
        expect(Math.abs(laserOffset(y, H, t, wave))).toBeLessThanOrEqual(
          10 + 1e-9,
        );
      }
    }
  });

  it("has the given number of waves over the height", () => {
    // Count upward zero crossings from top to bottom.
    let crossings = 0;
    let previous = laserOffset(0.5, H, T, wave);
    for (let y = 1.5; y < H; y += 1) {
      const current = laserOffset(y, H, T, wave);
      if (previous < 0 && current >= 0) crossings++;
      previous = current;
    }
    expect(crossings).toBeGreaterThanOrEqual(11);
    expect(crossings).toBeLessThanOrEqual(12);
  });

  it("flips sign over the breathe cycle (+1 → -1)", () => {
    const y = H / 48; // a quarter wavelength down: a peak at time T
    expect(laserOffset(y, H, T, { ...wave, travelMs: Infinity })).toBeCloseTo(
      10,
    );
    expect(
      laserOffset(y, H, T + 2000, { ...wave, travelMs: Infinity }),
    ).toBeCloseTo(-10);
    expect(
      laserOffset(y, H, T + 1000, { ...wave, travelMs: Infinity }),
    ).toBeCloseTo(0);
  });

  it("moves the peaks downwards over time", () => {
    // Where is the first peak (within one wavelength of the top)?
    const peakY = (t: number) => {
      let best = 0;
      for (let y = 0; y < H / 12; y += 0.25) {
        if (laserOffset(y, H, t, wave) > laserOffset(best, H, t, wave))
          best = y;
      }
      return best;
    };
    // Between 1.0 s and 1.3 s the amplitude stays positive, and the peak
    // should move down by 60 px × 300 / 6000 = 3 px.
    expect(peakY(1300) - peakY(1000)).toBeCloseTo(3, 0);
  });
});
