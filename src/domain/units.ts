/**
 * Pure unit-conversion math (kg<->lb, cm<->ft/in, km<->mi) + rounding helpers.
 *
 * NOTE: PLAN.md §4 places `units.ts` under `src/lib`, but the app's hard
 * rule #3 ("calculation logic only in src/domain") means the actual math
 * belongs here. `src/lib/units.ts` should re-export/format these functions
 * for display (e.g. locale-aware formatting) rather than re-implement them.
 */

export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;
export const KM_PER_MILE = 1.609344;
export const INCHES_PER_FOOT = 12;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export interface FeetInches {
  feet: number;
  inches: number;
}

/** Splits a height in cm into whole feet + remaining inches (inches rounded to nearest whole). */
export function cmToFeetInches(cm: number): FeetInches {
  const totalInches = cmToInches(cm);
  const roundedTotalInches = Math.round(totalInches);
  const feet = Math.floor(roundedTotalInches / INCHES_PER_FOOT);
  const inches = roundedTotalInches - feet * INCHES_PER_FOOT;
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return inchesToCm(feet * INCHES_PER_FOOT + inches);
}

export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

export function roundTo(value: number, decimals: number = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** US customary fluid ounce in millilitres (exact by definition). */
export const ML_PER_FL_OZ = 29.5735295625;

export function mlToFlOz(ml: number): number {
  return ml / ML_PER_FL_OZ;
}

export function flOzToMl(flOz: number): number {
  return flOz * ML_PER_FL_OZ;
}
