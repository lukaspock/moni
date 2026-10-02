import type { Sex } from './types';

/** kcal ≈ energy stored/released per kg of body fat. Used for goal-rate <-> kcal/day conversion. */
export const KCAL_PER_KG = 7700;

/** §6.3 guardrails */
export const MAX_DEFICIT_PERCENT = 0.25; // deficit may not exceed 25% of TDEE
export const MAX_SURPLUS_KCAL = 500; // surplus capped at +500 kcal/day
export const MIN_KCAL_MALE = 1500;
export const MIN_KCAL_FEMALE = 1200;

export interface TargetGuardrailFlags {
  /** the requested deficit exceeded 25% of TDEE and was capped */
  deficitCapped: boolean;
  /** the requested surplus exceeded +500 kcal and was capped */
  surplusCapped: boolean;
  /** the resulting kcal target was below the sex-specific floor and was raised */
  minimumFloorApplied: boolean;
}

export interface BaseTargetResult {
  /** final daily kcal target (rest day, no workout bonus) */
  baseKcal: number;
  /** the delta implied by goalRateKgPerWeek, before any guardrail */
  rawDeltaKcal: number;
  /** the delta actually applied after deficit/surplus guardrails (before the floor) */
  appliedDeltaKcal: number;
  flags: TargetGuardrailFlags;
}

/** Delta = goal_rate_kg_per_week × 7700 / 7 */
export function weeklyRateToDailyDelta(goalRateKgPerWeek: number): number {
  return (goalRateKgPerWeek * KCAL_PER_KG) / 7;
}

/**
 * §6.3 – Goal adjustment with guardrails.
 * Negative goalRateKgPerWeek = weight loss, positive = gain, 0 = maintain.
 */
export function calculateBaseTarget(params: {
  tdee: number;
  sex: Sex;
  goalRateKgPerWeek: number;
}): BaseTargetResult {
  const { tdee, sex, goalRateKgPerWeek } = params;
  const rawDelta = weeklyRateToDailyDelta(goalRateKgPerWeek);
  let appliedDelta = rawDelta;
  const flags: TargetGuardrailFlags = {
    deficitCapped: false,
    surplusCapped: false,
    minimumFloorApplied: false,
  };

  if (appliedDelta < 0) {
    const maxDeficit = -tdee * MAX_DEFICIT_PERCENT;
    if (appliedDelta < maxDeficit) {
      appliedDelta = maxDeficit;
      flags.deficitCapped = true;
    }
  } else if (appliedDelta > MAX_SURPLUS_KCAL) {
    appliedDelta = MAX_SURPLUS_KCAL;
    flags.surplusCapped = true;
  }

  let baseKcal = tdee + appliedDelta;
  const minKcal = sex === 'male' ? MIN_KCAL_MALE : MIN_KCAL_FEMALE;
  if (baseKcal < minKcal) {
    baseKcal = minKcal;
    flags.minimumFloorApplied = true;
  }

  return {
    baseKcal: Math.round(baseKcal),
    rawDeltaKcal: Math.round(rawDelta),
    appliedDeltaKcal: Math.round(appliedDelta),
    flags,
  };
}

/**
 * §6.4 – Dynamic daily limit.
 * dailyLimit = baseKcal + workoutBonusKcal
 *
 * The bonus only ever comes from REAL data: a completed workout (recorded in møni or
 * imported from Apple Health). bonus = actual kcal_burned × eat_back_factor.
 * No workout (rest day, planned-but-not-done, nothing imported) → bonus is 0.
 * There is deliberately no provisional/planned bonus.
 */
export const DEFAULT_EAT_BACK_FACTOR = 0.7;
/** `profiles.eat_back_factor` DB check range. */
export const MAX_EAT_BACK_FACTOR = 1.5;

export interface DynamicLimitInput {
  baseKcal: number;
  /** summed kcal_burned of the day's completed workouts; 0/undefined = none */
  actualKcalBurned?: number;
  /** profiles.eat_back_factor, default 0.7; clamped to 0..1.5, invalid values fall back to the default */
  eatBackFactor?: number | null;
}

export interface DynamicLimitResult {
  workoutBonusKcal: number;
  dailyLimitKcal: number;
}

export function calculateWorkoutBonus(
  input: DynamicLimitInput,
): DynamicLimitResult {
  // null/NaN/out-of-range values (a bad profile row) must never leak NaN into the daily limit.
  const rawFactor = input.eatBackFactor;
  const eatBackFactor =
    typeof rawFactor === 'number' && Number.isFinite(rawFactor)
      ? Math.min(MAX_EAT_BACK_FACTOR, Math.max(0, rawFactor))
      : DEFAULT_EAT_BACK_FACTOR;
  const rawBurned = input.actualKcalBurned ?? 0;
  const burned = Number.isFinite(rawBurned) ? Math.max(0, rawBurned) : 0;
  const bonus = Math.round(burned * eatBackFactor);
  return {
    workoutBonusKcal: bonus,
    dailyLimitKcal: input.baseKcal + bonus,
  };
}
