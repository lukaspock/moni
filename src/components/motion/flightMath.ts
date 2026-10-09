/** Pure flight-path math for MealFlight (worklet-safe). */

export interface Point {
  x: number;
  y: number;
}

/** Arc height in points (spec: sin(π·p) · -28). */
export const FLIGHT_ARC = 28;

export function flightPosition(
  p: number,
  from: Point,
  to: Point,
  arc: number = FLIGHT_ARC,
): Point {
  'worklet';
  const c = p < 0 ? 0 : p > 1 ? 1 : p;
  return {
    x: from.x + (to.x - from.x) * c,
    y: from.y + (to.y - from.y) * c - Math.sin(Math.PI * c) * arc,
  };
}

/** 1 -> 0.6 while travelling. */
export function flightScale(p: number): number {
  'worklet';
  const c = p < 0 ? 0 : p > 1 ? 1 : p;
  return 1 - 0.4 * c;
}

/** 1 -> 0.85 while travelling. */
export function flightOpacity(p: number): number {
  'worklet';
  const c = p < 0 ? 0 : p > 1 ? 1 : p;
  return 1 - 0.15 * c;
}
