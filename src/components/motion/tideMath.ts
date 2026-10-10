/** Pure geometry/time math for TideLoader (worklet-safe). */

/** One full driver cycle; every periodic part divides it evenly. */
export const TIDE_PERIOD_MS = 6400;
/** Orbit turns and wave cycles per driver cycle (1600 ms each). */
export const TIDE_TURNS = 4;
/** The level rises and falls twice per driver cycle (3200 ms). */
export const TIDE_LEVEL_CYCLES = 2;

/** Slowly rising and falling level, 0..1, centred at 0.5. */
export function tideLevel(phase01: number): number {
  'worklet';
  return 0.5 + 0.16 * Math.sin(2 * Math.PI * TIDE_LEVEL_CYCLES * phase01);
}

/** y of the water surface at x (SVG coordinates, y grows downward). */
export function waveY(
  x: number,
  left: number,
  width: number,
  baseY: number,
  amp: number,
  phase01: number,
): number {
  'worklet';
  const u = width > 0 ? (x - left) / width : 0;
  return (
    baseY + amp * Math.sin(2 * Math.PI * (1.25 * u + TIDE_TURNS * phase01))
  );
}

/** Y of the surface for a fill level inside a circle of radius r centred at cy. */
export function surfaceBaseY(cy: number, r: number, level: number): number {
  'worklet';
  const l = level < 0 ? 0 : level > 1 ? 1 : level;
  return cy + r - l * 2 * r;
}
