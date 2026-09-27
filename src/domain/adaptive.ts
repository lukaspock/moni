import { KCAL_PER_KG } from './targets';

/**
 * §6.7 – Adaptive TDEE.
 *
 * Prerequisites (all must hold, otherwise fall back to the formula TDEE):
 * - >= 14 days of data
 * - >= 8 weight entries
 * - >= 80% of days have a food log
 *
 * observed_TDEE = avgIntakeKcal − (Δ trend-weight_kg × 7700) / days
 * blended = w · observed + (1 − w) · formula
 *
 * Design decision for w (not fully specified in PLAN, documented here):
 * w grows with data volume/completeness and is capped at 0.8. It is the
 * average of three 0..1 factors (days of data, number of weight entries,
 * food-log coverage), each saturating at a "full data" reference point,
 * scaled by MAX_BLEND_WEIGHT. The same average is also used as the
 * confidence score (0..1) reported to the UI.
 *
 *   daysFactor    = min(1, daysOfData / BLEND_FULL_DATA_DAYS)
 *   entriesFactor = min(1, weightEntryCount / BLEND_FULL_WEIGHT_ENTRIES)
 *   coverageFactor= clamp(foodLogCoverage, 0, 1)
 *   dataScore     = avg(daysFactor, entriesFactor, coverageFactor)
 *   w             = MAX_BLEND_WEIGHT × dataScore
 *   confidence    = dataScore
 *
 * The resulting blended TDEE is clamped to at most ±150 kcal away from the
 * previous week's blended TDEE, so the target never jumps abruptly.
 */

export const ADAPTIVE_MIN_DAYS = 14;
export const ADAPTIVE_MIN_WEIGHT_ENTRIES = 8;
export const ADAPTIVE_MIN_FOOD_LOG_COVERAGE = 0.8;

export const WEIGHT_EMA_ALPHA = 0.1;
export const MAX_WEEKLY_CHANGE_KCAL = 150;
export const MAX_BLEND_WEIGHT = 0.8;

/** data volume at which the corresponding blend-weight factor saturates to 1.0 */
export const BLEND_FULL_DATA_DAYS = 90;
export const BLEND_FULL_WEIGHT_ENTRIES = 60;

export interface AdaptivePrerequisiteInput {
  daysOfData: number;
  weightEntryCount: number;
  /** fraction (0..1) of days in the window that have at least one food log */
  foodLogCoverage: number;
}

export function checkAdaptivePrerequisites(input: AdaptivePrerequisiteInput): boolean {
  return (
    input.daysOfData >= ADAPTIVE_MIN_DAYS &&
    input.weightEntryCount >= ADAPTIVE_MIN_WEIGHT_ENTRIES &&
    input.foodLogCoverage >= ADAPTIVE_MIN_FOOD_LOG_COVERAGE
  );
}

/**
 * Exponential moving average of a weight series (chronological order),
 * used to smooth day-to-day water-weight noise. alpha defaults to 0.1.
 */
export function calculateWeightEMA(weights: number[], alpha: number = WEIGHT_EMA_ALPHA): number[] {
  if (weights.length === 0) return [];
  const result: number[] = [weights[0]];
  for (let i = 1; i < weights.length; i++) {
    result.push(alpha * weights[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

export function calculateObservedTDEE(avgIntakeKcal: number, trendWeightDeltaKg: number, days: number): number {
  if (days <= 0) return avgIntakeKcal;
  return avgIntakeKcal - (trendWeightDeltaKg * KCAL_PER_KG) / days;
}

export function calculateDataScore(input: AdaptivePrerequisiteInput): number {
  const daysFactor = Math.min(1, input.daysOfData / BLEND_FULL_DATA_DAYS);
  const entriesFactor = Math.min(1, input.weightEntryCount / BLEND_FULL_WEIGHT_ENTRIES);
  const coverageFactor = Math.min(1, Math.max(0, input.foodLogCoverage));
  return (daysFactor + entriesFactor + coverageFactor) / 3;
}

export function calculateBlendWeight(input: AdaptivePrerequisiteInput): number {
  return MAX_BLEND_WEIGHT * calculateDataScore(input);
}

export function blendTDEE(observedTDEE: number, formulaTDEE: number, w: number): number {
  const clampedW = Math.min(1, Math.max(0, w));
  return clampedW * observedTDEE + (1 - clampedW) * formulaTDEE;
}

export function clampWeeklyChange(
  newTDEE: number,
  previousTDEE: number,
  maxChange: number = MAX_WEEKLY_CHANGE_KCAL,
): number {
  const delta = newTDEE - previousTDEE;
  const clampedDelta = Math.min(maxChange, Math.max(-maxChange, delta));
  return previousTDEE + clampedDelta;
}

export type AdaptiveReasonCode =
  | 'insufficient_data'
  | 'observed_higher_than_formula'
  | 'observed_lower_than_formula'
  | 'aligned_with_formula'
  | 'clamped_by_weekly_limit';

export interface AdaptiveTDEEResult {
  formulaTDEE: number;
  /** null when prerequisites are not met */
  observedTDEE: number | null;
  blendedTDEE: number;
  /** 0..1 */
  confidence: number;
  reasonCode: AdaptiveReasonCode;
  /** blendedTDEE - previousBlendedTDEE, after clamping */
  weeklyChangeKcal: number;
}

export interface ComputeAdaptiveTDEEInput {
  formulaTDEE: number;
  /** last stored blended_tdee; pass formulaTDEE if this is the first computation */
  previousBlendedTDEE: number;
  avgIntakeKcal: number;
  trendWeightDeltaKg: number;
  days: number;
  prerequisites: AdaptivePrerequisiteInput;
}

/** Threshold (kcal) above which observed vs. formula TDEE is reported as meaningfully different. */
const ALIGNMENT_THRESHOLD_KCAL = 50;

export function computeAdaptiveTDEE(input: ComputeAdaptiveTDEEInput): AdaptiveTDEEResult {
  const prereqsMet = checkAdaptivePrerequisites(input.prerequisites);
  if (!prereqsMet) {
    return {
      formulaTDEE: Math.round(input.formulaTDEE),
      observedTDEE: null,
      blendedTDEE: Math.round(input.formulaTDEE),
      confidence: 0,
      reasonCode: 'insufficient_data',
      weeklyChangeKcal: 0,
    };
  }

  const observed = calculateObservedTDEE(input.avgIntakeKcal, input.trendWeightDeltaKg, input.days);
  const w = calculateBlendWeight(input.prerequisites);
  const blendedRaw = blendTDEE(observed, input.formulaTDEE, w);
  const clamped = clampWeeklyChange(blendedRaw, input.previousBlendedTDEE);
  const wasClamped = Math.abs(clamped - blendedRaw) > 0.01;
  const confidence = calculateDataScore(input.prerequisites);

  let reasonCode: AdaptiveReasonCode;
  if (wasClamped) {
    reasonCode = 'clamped_by_weekly_limit';
  } else if (observed > input.formulaTDEE + ALIGNMENT_THRESHOLD_KCAL) {
    reasonCode = 'observed_higher_than_formula';
  } else if (observed < input.formulaTDEE - ALIGNMENT_THRESHOLD_KCAL) {
    reasonCode = 'observed_lower_than_formula';
  } else {
    reasonCode = 'aligned_with_formula';
  }

  return {
    formulaTDEE: Math.round(input.formulaTDEE),
    observedTDEE: Math.round(observed),
    blendedTDEE: Math.round(clamped),
    confidence: Math.round(confidence * 100) / 100,
    reasonCode,
    weeklyChangeKcal: Math.round(clamped - input.previousBlendedTDEE),
  };
}
