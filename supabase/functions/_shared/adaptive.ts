// (Deno copy) KCAL_PER_KG is inlined instead of imported from ./targets
const KCAL_PER_KG = 7700;

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
 * previous week's blended TDEE, so the target never jumps abruptly, and finally
 * to a safety band around the formula TDEE (SAFETY_MIN/MAX_FORMULA_RATIO) and
 * an absolute floor (MIN_TDEE_KCAL), so bad data can never produce a wild target.
 *
 * NOTE: supabase/functions/_shared/adaptive.ts is a verbatim copy of this file
 * (only the KCAL_PER_KG import line differs) — `adaptive.sync.test.ts` fails if
 * they drift. Edit here, then re-copy.
 */

export const ADAPTIVE_MIN_DAYS = 14;
export const ADAPTIVE_MIN_WEIGHT_ENTRIES = 8;
export const ADAPTIVE_MIN_FOOD_LOG_COVERAGE = 0.8;

export const WEIGHT_EMA_ALPHA = 0.1;
export const MAX_WEEKLY_CHANGE_KCAL = 150;
export const MAX_BLEND_WEIGHT = 0.8;

/** Safety band: the adaptive TDEE may never leave [0.75, 1.30] x formula TDEE. */
export const SAFETY_MIN_FORMULA_RATIO = 0.75;
export const SAFETY_MAX_FORMULA_RATIO = 1.3;
/** Absolute floor for any adaptive TDEE (kcal/day). */
export const MIN_TDEE_KCAL = 1200;
/** Minimum span (days) between first and last weight entry to derive a trend rate. */
export const MIN_TREND_SPAN_DAYS = 7;
/** Observation window (days, ending yesterday) used by the recompute. */
export const ADAPTIVE_WINDOW_DAYS = 28;

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

export function clampToSafetyBand(tdee: number, formulaTDEE: number): number {
  const lo = Math.max(MIN_TDEE_KCAL, formulaTDEE * SAFETY_MIN_FORMULA_RATIO);
  const hi = Math.max(lo, formulaTDEE * SAFETY_MAX_FORMULA_RATIO);
  return Math.min(hi, Math.max(lo, tdee));
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
  const prereqsMet =
    checkAdaptivePrerequisites(input.prerequisites) &&
    input.days >= MIN_TREND_SPAN_DAYS &&
    Number.isFinite(input.avgIntakeKcal) &&
    Number.isFinite(input.trendWeightDeltaKg);
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
  const weeklyClamped = clampWeeklyChange(blendedRaw, input.previousBlendedTDEE);
  const clamped = clampToSafetyBand(weeklyClamped, input.formulaTDEE);
  const wasClamped = Math.abs(weeklyClamped - blendedRaw) > 0.01;
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

// ---------------------------------------------------------------------------
// Window summary: raw rows -> inputs of computeAdaptiveTDEE
// ---------------------------------------------------------------------------

export interface AdaptiveWeightEntry {
  /** local YYYY-MM-DD */
  date: string;
  weightKg: number;
}

export interface AdaptiveWindowInput {
  weights: AdaptiveWeightEntry[];
  /** kcal summed per local day, only days that have at least one food log */
  intakeKcalByDate: Record<string, number>;
  /** first day of the window (inclusive), YYYY-MM-DD */
  windowStart: string;
  /** last day of the window (inclusive), normally yesterday */
  windowEnd: string;
}

export interface AdaptiveWindowSummary {
  prerequisites: AdaptivePrerequisiteInput;
  avgIntakeKcal: number;
  trendWeightDeltaKg: number;
  /** span in days between first and last weight day (rate denominator) */
  days: number;
}

/** whole days from a to b (YYYY-MM-DD), DST-safe (UTC arithmetic) */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** YYYY-MM-DD shifted by `delta` days (UTC arithmetic). */
export function shiftIsoDate(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** Monday of the week containing `isoDate`, as YYYY-MM-DD. */
export function weekStartOf(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday = 0
  return shiftIsoDate(isoDate, -dow);
}

/**
 * Summarizes the observation window. Weights are collapsed to one value per day (mean), then
 * EMA-smoothed. The trend delta and the intake average both refer to the same span (first ..
 * last weigh-in day); intake is averaged over *logged* days only (unlogged days would drag the
 * average towards zero). `daysOfData` runs from the earliest weight/food day in the window to
 * windowEnd; coverage = logged days / daysOfData.
 */
export function summarizeAdaptiveWindow(input: AdaptiveWindowInput): AdaptiveWindowSummary {
  const { windowStart, windowEnd } = input;
  const inWindow = (d: string) => d >= windowStart && d <= windowEnd;

  const perDay = new Map<string, number[]>();
  let weightEntryCount = 0;
  for (const w of input.weights) {
    if (!inWindow(w.date) || !Number.isFinite(w.weightKg) || w.weightKg <= 0) continue;
    weightEntryCount += 1;
    const arr = perDay.get(w.date) ?? [];
    arr.push(w.weightKg);
    perDay.set(w.date, arr);
  }
  const weightDays = [...perDay.keys()].sort();
  const dailyWeights = weightDays.map((d) => {
    const arr = perDay.get(d)!;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  });

  const loggedDays = Object.keys(input.intakeKcalByDate)
    .filter((d) => inWindow(d) && input.intakeKcalByDate[d] > 0)
    .sort();

  const allDays = [...weightDays, ...loggedDays].sort();
  const daysOfData = allDays.length === 0 ? 0 : daysBetween(allDays[0], windowEnd) + 1;
  const foodLogCoverage = daysOfData === 0 ? 0 : Math.min(1, loggedDays.length / daysOfData);

  let trendWeightDeltaKg = 0;
  let days = 0;
  let avgIntakeKcal = 0;
  if (weightDays.length >= 2) {
    const ema = calculateWeightEMA(dailyWeights);
    trendWeightDeltaKg = ema[ema.length - 1] - ema[0];
    const first = weightDays[0];
    const last = weightDays[weightDays.length - 1];
    const spanLogged = loggedDays.filter((d) => d >= first && d <= last);
    if (spanLogged.length > 0) {
      days = daysBetween(first, last);
      avgIntakeKcal = spanLogged.reduce((s, d) => s + input.intakeKcalByDate[d], 0) / spanLogged.length;
    }
  }

  return {
    prerequisites: { daysOfData, weightEntryCount, foodLogCoverage },
    avgIntakeKcal,
    trendWeightDeltaKg,
    days,
  };
}
