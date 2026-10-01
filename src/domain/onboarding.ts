/**
 * §7.1 – Onboarding result-screen preview.
 *
 * Pure composition of the existing bmr/tdee/targets/macros/met building
 * blocks so the onboarding result screen (and the sign-up write step, for
 * `training_plan_days.expected_kcal`) can call one function instead of
 * duplicating the pipeline. No new formulas — see the referenced modules for
 * the actual math.
 */

import { calculateBMR, ageFromBirthDate } from './bmr';
import { calculateBaseTDEE } from './tdee';
import {
  calculateBaseTarget,
  calculateWorkoutBonus,
  type BaseTargetResult,
} from './targets';
import { calculateMacros, type MacroResult } from './macros';
import {
  calculateSessionDensity,
  estimateStrengthMET,
  calculateKcalBurned,
} from './met';
import {
  classifyPace,
  dailyDeltaToWeeklyRate,
  projectDateAfterWeeks,
  projectWeightCurve,
  weeksToReachTarget,
  type PaceLevel,
  type ProjectionPoint,
} from './projection';
import type { ActivityLevel, Goal, Sex } from './types';

/**
 * Default assumption used only where the real plan/workout data doesn't
 * exist yet (onboarding preview, and the `training_plan_days.expected_kcal`
 * seeded at sign-up): a 60-minute strength session at a "moderate" session
 * density (20 sets / 60 min ≈ 0.33 sets/min, roughly the middle of the
 * STRENGTH_DENSITY_MIN..MAX range in met.ts).
 */
export const DEFAULT_SESSION_MINUTES = 60;
export const DEFAULT_SESSION_TOTAL_SETS = 20;

/** Estimated kcal burned for a default 60-minute strength session at the given bodyweight (§6.5). */
export function estimateDefaultWorkoutExpectedKcal(weightKg: number): number {
  const density = calculateSessionDensity(
    DEFAULT_SESSION_TOTAL_SETS,
    DEFAULT_SESSION_MINUTES,
  );
  const met = estimateStrengthMET(density);
  return Math.round(
    calculateKcalBurned(met, weightKg, DEFAULT_SESSION_MINUTES / 60),
  );
}

/** Plausibility bounds for onboarding body input (catches typos like 1.8 m typed as "1.8" cm). */
export const HEIGHT_CM_RANGE = { min: 100, max: 250 } as const;
export const WEIGHT_KG_RANGE = { min: 30, max: 300 } as const;

export function isPlausibleHeightCm(
  heightCm: number | null | undefined,
): boolean {
  return (
    heightCm != null &&
    heightCm >= HEIGHT_CM_RANGE.min &&
    heightCm <= HEIGHT_CM_RANGE.max
  );
}

export function isPlausibleWeightKg(
  weightKg: number | null | undefined,
): boolean {
  return (
    weightKg != null &&
    weightKg >= WEIGHT_KG_RANGE.min &&
    weightKg <= WEIGHT_KG_RANGE.max
  );
}

export interface OnboardingPreviewInput {
  sex: Sex;
  birthDate: Date;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  goalRateKgPerWeek: number;
  /** true if at least one training day/week was chosen */
  hasTrainingDays: boolean;
  eatBackFactor?: number;
}

export interface OnboardingDayPreview {
  totalKcal: number;
  workoutBonusKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface OnboardingPreviewResult {
  bmr: number;
  tdee: number;
  base: BaseTargetResult;
  restDay: OnboardingDayPreview;
  trainingDay: OnboardingDayPreview;
}

export function computeOnboardingPreview(
  input: OnboardingPreviewInput,
): OnboardingPreviewResult {
  const age = ageFromBirthDate(input.birthDate);
  const bmr = calculateBMR(input.sex, input.weightKg, input.heightCm, age);
  const tdee = calculateBaseTDEE(bmr, input.activityLevel);
  const base = calculateBaseTarget({
    tdee,
    sex: input.sex,
    goalRateKgPerWeek: input.goalRateKgPerWeek,
  });
  const isDeficit = input.goal === 'lose';

  const restMacros: MacroResult = calculateMacros({
    totalKcal: base.baseKcal,
    weightKg: input.weightKg,
    isStrengthDay: false,
    isDeficit,
  });

  const expectedKcal = input.hasTrainingDays
    ? estimateDefaultWorkoutExpectedKcal(input.weightKg)
    : 0;
  const bonus = calculateWorkoutBonus({
    baseKcal: base.baseKcal,
    // Onboarding preview only: what a typical training day would add (illustrative, not a plan bonus).
    actualKcalBurned: expectedKcal,
    eatBackFactor: input.eatBackFactor,
  });
  const trainingMacros: MacroResult = calculateMacros({
    totalKcal: bonus.dailyLimitKcal,
    weightKg: input.weightKg,
    isStrengthDay: true,
    isDeficit,
  });

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    base,
    restDay: {
      totalKcal: base.baseKcal,
      workoutBonusKcal: 0,
      ...restMacros,
    },
    trainingDay: {
      totalKcal: bonus.dailyLimitKcal,
      workoutBonusKcal: bonus.workoutBonusKcal,
      proteinG: trainingMacros.proteinG,
      carbsG: trainingMacros.carbsG,
      fatG: trainingMacros.fatG,
    },
  };
}

export interface GoalProjectionInput extends OnboardingPreviewInput {
  /** optional goal weight (lose/gain only); null/maintain → no target date */
  targetWeightKg: number | null;
  /** projection start, usually today */
  startDate: Date;
}

export interface GoalProjectionResult {
  preview: OnboardingPreviewResult;
  /** kcal/day difference to maintenance that is actually applied (after §6.3 guardrails + floor) */
  dailyDeltaKcal: number;
  /** kg/week implied by `dailyDeltaKcal` — what the projection uses */
  effectiveRateKgPerWeek: number;
  /** pace of the rate the user *asked for* (drives the warning on the rate screen) */
  pace: PaceLevel;
  /** null when there's no (reachable) target */
  weeksToTarget: number | null;
  targetDate: Date | null;
  curve: ProjectionPoint[];
}

/**
 * Everything the target-weight/rate/result screens show live: guardrail-adjusted
 * rest-day target, effective weekly rate, pace, projected goal date and curve.
 */
export function computeGoalProjection(
  input: GoalProjectionInput,
): GoalProjectionResult {
  const preview = computeOnboardingPreview(input);
  const dailyDeltaKcal = preview.restDay.totalKcal - preview.tdee;
  const effectiveRateKgPerWeek =
    input.goal === 'maintain' ? 0 : dailyDeltaToWeeklyRate(dailyDeltaKcal);
  const target = input.goal === 'maintain' ? null : input.targetWeightKg;
  const weeksToTarget =
    target == null
      ? null
      : weeksToReachTarget(input.weightKg, target, effectiveRateKgPerWeek);

  return {
    preview,
    dailyDeltaKcal,
    effectiveRateKgPerWeek,
    pace: classifyPace(input.goalRateKgPerWeek, input.weightKg),
    weeksToTarget,
    targetDate:
      weeksToTarget == null
        ? null
        : projectDateAfterWeeks(input.startDate, weeksToTarget),
    curve: projectWeightCurve({
      currentWeightKg: input.weightKg,
      targetWeightKg: target,
      rateKgPerWeek: effectiveRateKgPerWeek,
    }),
  };
}
