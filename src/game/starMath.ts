// Pure helpers for the starfield, kept free of Phaser so they can be unit-tested.

/**
 * Move a star horizontally and wrap it around the screen edges.
 *
 * @param x         current x position in pixels
 * @param speed     pixels per second (always positive)
 * @param direction +1 moves right, -1 moves left
 * @param deltaMs   time since the previous frame, in milliseconds
 * @param width     screen width in pixels
 */
export function driftX(
  x: number,
  speed: number,
  direction: 1 | -1,
  deltaMs: number,
  width: number,
): number {
  const moved = x + direction * speed * (deltaMs / 1000);
  // JavaScript's % keeps the sign of the left side (-5 % 100 = -5), so add
  // width and take % again to always land in [0, width).
  return ((moved % width) + width) % width;
}
