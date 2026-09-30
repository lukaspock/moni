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
 * - Planned training day, workout not done yet, day still open: provisional
 *   bonus = expected_kcal × eat_back_factor (shown dashed in the ring).
 * - Workout actually completed (planned or not): bonus = actual kcal_burned
 *   × eat_back_factor, replaces any provisional bonus.
 * - Planned training day, day over, workout never logged: bonus drops to 0.
 * - Rest day, no workout: bonus is 0.
 */
export const DEFAULT_EAT_BACK_FACTOR = 0.7;

export interface DynamicLimitInput {
  baseKcal: number;
  isTrainingDay: boolean;
  /** expected_kcal from training_plan_days for this weekday, if any */
  plannedExpectedKcal?: number;
  /** true once a workout has actually been logged for the day */
  workoutCompleted: boolean;
  /** actual kcal_burned of the logged workout (required when workoutCompleted) */
  actualKcalBurned?: number;
  /** true once the day is considered "over" (e.g. evening cutoff) for provisional-bonus purposes */
  isDayOver: boolean;
  /** profiles.eat_back_factor, default 0.7 */
  eatBackFactor?: number;
}

export interface DynamicLimitResult {
  workoutBonusKcal: number;
  /** true when the bonus is a dashed/provisional estimate rather than an actual value */
  isProvisional: boolean;
  dailyLimitKcal: number;
}

export function calculateWorkoutBonus(
  input: DynamicLimitInput,
): DynamicLimitResult {
  const eatBackFactor = input.eatBackFactor ?? DEFAULT_EAT_BACK_FACTOR;

  // A workout was actually logged (planned or unplanned) -> use the real value.
  if (input.workoutCompleted && input.actualKcalBurned != null) {
    const bonus = Math.round(input.actualKcalBurned * eatBackFactor);
    return {
      workoutBonusKcal: bonus,
      isProvisional: false,
      dailyLimitKcal: input.baseKcal + bonus,
    };
  }

  // Planned training day, still pending, day not over yet -> provisional estimate.
  if (input.isTrainingDay && !input.workoutCompleted && !input.isDayOver) {
    const expected = input.plannedExpectedKcal ?? 0;
    const bonus = Math.round(expected * eatBackFactor);
    return {
      workoutBonusKcal: bonus,
      isProvisional: true,
      dailyLimitKcal: input.baseKcal + bonus,
    };
  }

  // Planned training day, day is over and nothing was logged -> the planned workout was skipped.
  // Rest day with no workout falls into this branch too (bonus is simply 0).
  return {
    workoutBonusKcal: 0,
    isProvisional: false,
    dailyLimitKcal: input.baseKcal,
  };
}
