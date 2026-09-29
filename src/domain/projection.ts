/**
 * Onboarding v2 – goal weight & pace math (PLAN §6.3, §10 "no aggressive deficit").
 *
 * Pure helpers for: BMI-based sanity bounds on a target weight, suggested
 * target weights, pace classification, "weeks/date to reach the target",
 * and the points of the projected weight curve shown on the result screen.
 * The projection is deliberately a simple straight line at the *effective*
 * weekly rate (after the §6.3 guardrails) — an honest estimate, not a promise.
 */

import { KCAL_PER_KG } from './targets';
import type { Goal } from './types';

/** WHO BMI cut-offs. */
export const BMI_UNDERWEIGHT = 18.5;
export const BMI_HEALTHY_MAX = 24.9;
/** Target weights below this BMI are never suggested nor accepted. */
export const BMI_TARGET_MIN = 17;
/** Upper end of the target-weight slider for weight gain (kg above current). */
export const MAX_GAIN_RANGE_KG = 25;
/** Smallest meaningful difference between current and target weight. */
export const MIN_TARGET_DIFF_KG = 0.5;

/** Starting rate when the user picks a goal (kg/week) — the "balanced" middle for most people. */
export const DEFAULT_RATE_LOSE = -0.5;
export const DEFAULT_RATE_GAIN = 0.25;

/**
 * Rate to use after (re-)picking a goal: keeps the previous rate if it still
 * points in the right direction, otherwise the goal's default (0 for maintain).
 */
export function defaultGoalRate(goal: Goal, previousRateKgPerWeek = 0): number {
  if (goal === 'maintain') return 0;
  if (goal === 'lose') return previousRateKgPerWeek < 0 ? previousRateKgPerWeek : DEFAULT_RATE_LOSE;
  return previousRateKgPerWeek > 0 ? previousRateKgPerWeek : DEFAULT_RATE_GAIN;
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function weightForBMI(bmi: number, heightCm: number): number {
  const m = heightCm / 100;
  return bmi * m * m;
}

/** Healthy (BMI 18.5–24.9) weight range for a height, in kg (unrounded). */
export function healthyWeightRange(heightCm: number): { minKg: number; maxKg: number } {
  return { minKg: weightForBMI(BMI_UNDERWEIGHT, heightCm), maxKg: weightForBMI(BMI_HEALTHY_MAX, heightCm) };
}

/** Rounds to the nearest 0.5 kg (the target-weight picker's step). */
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/** Inverse of `weeklyRateToDailyDelta`: kcal/day delta → kg/week. */
export function dailyDeltaToWeeklyRate(dailyDeltaKcal: number): number {
  return (dailyDeltaKcal * 7) / KCAL_PER_KG;
}

export interface TargetWeightContext {
  goal: Goal;
  currentWeightKg: number;
  heightCm: number;
}

/**
 * Slider bounds for the target weight, rounded to 0.5 kg.
 * lose: [BMI 17 weight, current − 0.5] · gain: [current + 0.5, current + 25] · maintain: [current, current].
 * If the user is already at/below the BMI floor, `minKg === maxKg` (nothing sensible to pick).
 */
export function targetWeightBounds({ goal, currentWeightKg, heightCm }: TargetWeightContext): {
  minKg: number;
  maxKg: number;
} {
  if (goal === 'lose') {
    const maxKg = roundToHalf(currentWeightKg - MIN_TARGET_DIFF_KG);
    const floor = Math.ceil(weightForBMI(BMI_TARGET_MIN, heightCm) * 2) / 2;
    return { minKg: Math.min(floor, maxKg), maxKg };
  }
  if (goal === 'gain') {
    return {
      minKg: roundToHalf(currentWeightKg + MIN_TARGET_DIFF_KG),
      maxKg: roundToHalf(currentWeightKg + MAX_GAIN_RANGE_KG),
    };
  }
  const current = roundToHalf(currentWeightKg);
  return { minKg: current, maxKg: current };
}

/**
 * Sensible default the target-weight screen starts on:
 * lose → ~10 % less, but not below a BMI of 21 (and always at least 0.5 kg below current);
 * gain → ~5 % more; maintain → current. Always clamped into `targetWeightBounds`.
 */
export function suggestTargetWeight(ctx: TargetWeightContext): number {
  const { goal, currentWeightKg, heightCm } = ctx;
  const { minKg, maxKg } = targetWeightBounds(ctx);
  let candidate: number;
  if (goal === 'lose') {
    candidate = Math.max(currentWeightKg * 0.9, weightForBMI(21, heightCm));
  } else if (goal === 'gain') {
    candidate = currentWeightKg * 1.05;
  } else {
    candidate = currentWeightKg;
  }
  return Math.min(Math.max(roundToHalf(candidate), minKg), maxKg);
}

export type TargetWeightStatus =
  /** fine */
  | 'ok'
  /** target is on the wrong side of the current weight for the goal (e.g. "lose" but higher) */
  | 'wrongDirection'
  /** BMI below BMI_TARGET_MIN — not accepted */
  | 'tooLow'
  /** BMI 17–18.5 — accepted, but the UI should show a gentle warning */
  | 'underweight';

export function validateTargetWeight(ctx: TargetWeightContext & { targetWeightKg: number }): TargetWeightStatus {
  const { goal, currentWeightKg, targetWeightKg, heightCm } = ctx;
  if (goal === 'maintain') return 'ok';
  if (goal === 'lose' && targetWeightKg >= currentWeightKg) return 'wrongDirection';
  if (goal === 'gain' && targetWeightKg <= currentWeightKg) return 'wrongDirection';
  const bmi = calculateBMI(targetWeightKg, heightCm);
  if (bmi < BMI_TARGET_MIN) return 'tooLow';
  if (bmi < BMI_UNDERWEIGHT) return 'underweight';
  return 'ok';
}

/**
 * Goal-independent sanity check (e.g. editing the goal weight later in the
 * profile, where the current weight may be stale): BMI ≥ BMI_TARGET_MIN and
 * inside the DB's `0 < target_weight_kg < 500` constraint.
 */
export function isAcceptableTargetWeight(targetWeightKg: number, heightCm: number): boolean {
  if (!(targetWeightKg > 0 && targetWeightKg < 500) || !(heightCm > 0)) return false;
  return calculateBMI(targetWeightKg, heightCm) >= BMI_TARGET_MIN;
}

/** Weeks until the target is reached at a constant weekly rate; null if unreachable (0 rate / wrong sign). */
export function weeksToReachTarget(currentWeightKg: number, targetWeightKg: number, rateKgPerWeek: number): number | null {
  const diff = targetWeightKg - currentWeightKg;
  if (diff === 0) return 0;
  if (rateKgPerWeek === 0 || Math.sign(diff) !== Math.sign(rateKgPerWeek)) return null;
  return diff / rateKgPerWeek;
}

/** Calendar date `weeks` after `startDate` (rounded to whole days, local time). */
export function projectDateAfterWeeks(startDate: Date, weeks: number): Date {
  return new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + Math.round(weeks * 7));
}

export type PaceLevel = 'gentle' | 'balanced' | 'aggressive';

/**
 * Pace as % of bodyweight per week. Loss: ≤0.5 % gentle, ≤1 % balanced, above aggressive.
 * Gain (slower is better for lean mass): ≤0.25 % gentle, ≤0.5 % balanced, above aggressive.
 */
export function classifyPace(rateKgPerWeek: number, weightKg: number): PaceLevel {
  if (rateKgPerWeek === 0 || weightKg <= 0) return 'gentle';
  const percent = (Math.abs(rateKgPerWeek) / weightKg) * 100;
  const [gentleMax, balancedMax] = rateKgPerWeek < 0 ? [0.5, 1.0] : [0.25, 0.5];
  if (percent <= gentleMax + 1e-9) return 'gentle';
  if (percent <= balancedMax + 1e-9) return 'balanced';
  return 'aggressive';
}

export interface ProjectionPoint {
  week: number;
  weightKg: number;
}

/**
 * Points for the projected weight curve: a straight line from the current to the
 * target weight at `rateKgPerWeek`, followed by a short flat "maintain" tail
 * (+20 % of the duration, min. 2 weeks). Unreachable/maintain → flat 12-week line.
 */
export function projectWeightCurve(params: {
  currentWeightKg: number;
  targetWeightKg: number | null;
  rateKgPerWeek: number;
  samples?: number;
}): ProjectionPoint[] {
  const { currentWeightKg, targetWeightKg, rateKgPerWeek } = params;
  const samples = Math.max(params.samples ?? 24, 2);
  const weeks =
    targetWeightKg == null ? null : weeksToReachTarget(currentWeightKg, targetWeightKg, rateKgPerWeek);

  if (weeks == null || weeks === 0 || targetWeightKg == null) {
    return [
      { week: 0, weightKg: currentWeightKg },
      { week: 12, weightKg: currentWeightKg },
    ];
  }

  const points: ProjectionPoint[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const week = (weeks * i) / samples;
    points.push({ week, weightKg: currentWeightKg + rateKgPerWeek * week });
  }
  points[points.length - 1] = { week: weeks, weightKg: targetWeightKg };
  points.push({ week: weeks + Math.max(weeks * 0.2, 2), weightKg: targetWeightKg });
  return points;
}
