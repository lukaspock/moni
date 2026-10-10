/**
 * Water tracking: daily goal, progress and display units. Pure, metric in (ml).
 */
import type { UnitSystem } from './types';
import { mlToFlOz, roundTo } from './units';

/** ml per kg body weight for the base daily goal. */
export const WATER_ML_PER_KG = 35;
/** Extra ml on a training day (sweat losses). */
export const WATER_TRAINING_DAY_EXTRA_ML = 500;
/** Goals are rounded to whole glasses of this size. */
export const WATER_GOAL_STEP_ML = 250;
export const WATER_GOAL_MIN_ML = 1500;
export const WATER_GOAL_MAX_ML = 4000;
/** Goal used when no body weight is known yet. */
export const WATER_DEFAULT_GOAL_ML = 2500;

/** Glass/bottle presets offered on long-press, smallest first. */
export const WATER_PRESETS_ML: readonly number[] = [250, 330, 500];
/** Size added by a single tap on the water card. */
export const WATER_DEFAULT_GLASS_ML = 250;
/** Upper bound of a single log (mirrors the `water_logs.ml` check constraint). */
export const WATER_MAX_SINGLE_ML = 5000;

/**
 * Daily water goal: 35 ml × kg (+500 ml on a training day), rounded to the
 * nearest 250 ml and clamped to 1500–4000 ml. Unknown weight → 2500 ml
 * (+ training extra, same rounding/clamp).
 */
export function calculateWaterGoalMl(input: {
  weightKg: number | null | undefined;
  isTrainingDay: boolean;
}): number {
  const { weightKg, isTrainingDay } = input;
  const base =
    weightKg != null && Number.isFinite(weightKg) && weightKg > 0
      ? weightKg * WATER_ML_PER_KG
      : WATER_DEFAULT_GOAL_ML;
  const raw = base + (isTrainingDay ? WATER_TRAINING_DAY_EXTRA_ML : 0);
  const rounded = Math.round(raw / WATER_GOAL_STEP_ML) * WATER_GOAL_STEP_ML;
  return Math.min(WATER_GOAL_MAX_ML, Math.max(WATER_GOAL_MIN_ML, rounded));
}

/** A valid single water amount (whole ml, 1..5000). */
export function isValidWaterAmount(ml: number): boolean {
  return Number.isInteger(ml) && ml > 0 && ml <= WATER_MAX_SINGLE_ML;
}

/** Sum of logged amounts (ignores non-positive/NaN values). */
export function sumWaterMl(logs: readonly { ml: number }[]): number {
  return logs.reduce(
    (sum, log) => (Number.isFinite(log.ml) && log.ml > 0 ? sum + log.ml : sum),
    0,
  );
}

export interface WaterProgress {
  consumedMl: number;
  goalMl: number;
  /** Still to drink, never negative. */
  remainingMl: number;
  /** 0..1 fill level for the visual (capped at 1). */
  fraction: number;
  reached: boolean;
  /** Default glasses still needed to reach the goal (rounded up). */
  glassesLeft: number;
}

export function waterProgress(
  consumedMl: number,
  goalMl: number,
  glassMl: number = WATER_DEFAULT_GLASS_ML,
): WaterProgress {
  const consumed = Math.max(0, consumedMl);
  const goal = Math.max(0, goalMl);
  const remainingMl = Math.max(0, goal - consumed);
  const fraction = goal > 0 ? Math.min(1, consumed / goal) : 0;
  return {
    consumedMl: consumed,
    goalMl: goal,
    remainingMl,
    fraction,
    reached: goal > 0 && consumed >= goal,
    glassesLeft: glassMl > 0 ? Math.ceil(remainingMl / glassMl) : 0,
  };
}

export type WaterDisplayUnit = 'ml' | 'l' | 'flOz';

export interface WaterDisplay {
  value: number;
  unit: WaterDisplayUnit;
}

/**
 * Display value for an amount: metric → ml below 1 l, litres (max. 2 decimals)
 * from 1000 ml; imperial → whole US fl oz.
 */
export function waterDisplay(ml: number, unitSystem: UnitSystem): WaterDisplay {
  if (unitSystem === 'imperial') {
    return { value: Math.round(mlToFlOz(ml)), unit: 'flOz' };
  }
  if (Math.abs(ml) >= 1000) {
    return { value: roundTo(ml / 1000, 2), unit: 'l' };
  }
  return { value: Math.round(ml), unit: 'ml' };
}
