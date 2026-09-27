// The laser's shape: a vertical sine wave. Pure maths, unit-tested.

export interface WaveOptions {
  /** Number of complete waves over `height`. */
  periods: number;
  /** Widest swing in pixels. */
  amplitude: number;
  /** Time for a peak to travel down one wavelength. */
  travelMs: number;
  /** Time for the amplitude to go +1 → -1 → +1. */
  breatheMs: number;
}

/**
 * Horizontal offset of the laser at height `y` and time `timeMs`.
 *
 *   offset = amplitude · sin(2π · breathe) · sin(2π · (periods · y / height − time / travel))
 *
 * The first sine makes the whole wave swell, flatten and flip. In the second,
 * subtracting time moves every peak to a larger y as time goes on: downwards.
 */
export function laserOffset(
  y: number,
  height: number,
  timeMs: number,
  wave: WaveOptions,
): number {
  const breathe = Math.sin((2 * Math.PI * timeMs) / wave.breatheMs);
  const phase = (wave.periods * y) / height - timeMs / wave.travelMs;
  return wave.amplitude * breathe * Math.sin(2 * Math.PI * phase);
}
