// møni · adaptive TDEE — minimal Deno-compatible port for the `recompute-targets` Edge
// Function (PLAN.md §6.7).
//
// *** KEEP IN SYNC BY HAND with src/domain/adaptive.ts *** — that file is the single source of
// truth for this formula (owned by the `domain` agent, pure TypeScript, unit-tested). This
// file is a deliberately thin, self-contained duplicate because Deno Edge Functions cannot
// import from `src/` (different runtime/bundling, and RN-adjacent code may creep into
// src/domain's neighborhood over time). Whenever src/domain/adaptive.ts's formula changes,
// port the change here too. Consider replacing this with a build step that copies
// src/domain/adaptive.ts into supabase/functions/_shared/ at deploy time once the project has
// a CI pipeline — tracked as a TODO, not done here since it's out of scope for Phase 0.
//
// This is Phase 6 functionality; recompute-targets is currently a thin skeleton (see
// index.ts) and this module is not wired into anything else yet.

export interface WeightPoint {
  date: string; // ISO date (YYYY-MM-DD)
  weight_kg: number;
}

export interface AdaptiveTdeeInput {
  /** Chronologically ordered (oldest first) daily average kcal intake for the window. */
  dailyIntakeKcal: number[];
  /** Chronologically ordered (oldest first) weight log points within the window. */
  weightPoints: WeightPoint[];
  /** Number of days in the observation window (usually the last 14-28 days). */
  windowDays: number;
  /** Fraction of days in the window that have at least one food log (0-1). */
  foodLogCoverage: number;
  /** This week's formula-based TDEE (Mifflin-St Jeor x activity factor), from src/domain/tdee.ts logic. */
  formulaTdee: number;
  /** Last week's blended TDEE, to cap the week-over-week change. */
  previousBlendedTdee: number | null;
}

export interface AdaptiveTdeeResult {
  eligible: boolean;
  reason?: string;
  observedTdee: number | null;
  blendedTdee: number;
  confidence: number; // 0-1, also used as the blend weight `w` (capped at 0.8)
  weightTrendKg: number | null;
}

const EMA_ALPHA = 0.1;
const KCAL_PER_KG = 7700;
const MIN_DAYS = 14;
const MIN_WEIGHT_ENTRIES = 8;
const MIN_FOOD_LOG_COVERAGE = 0.8;
const MAX_BLEND_WEIGHT = 0.8;
const MAX_WEEKLY_CHANGE_KCAL = 150;

/** Exponential moving average trend line over the raw weight points; smooths water-weight noise. */
export function computeWeightTrend(points: WeightPoint[]): number[] {
  if (points.length === 0) return [];
  const trend: number[] = [points[0].weight_kg];
  for (let i = 1; i < points.length; i++) {
    const prev = trend[i - 1];
    trend.push(prev + EMA_ALPHA * (points[i].weight_kg - prev));
  }
  return trend;
}

/**
 * Computes the adaptive/blended TDEE for one user, given a data window. Mirrors
 * src/domain/adaptive.ts — see the sync note at the top of this file.
 */
export function computeAdaptiveTdee(input: AdaptiveTdeeInput): AdaptiveTdeeResult {
  const { dailyIntakeKcal, weightPoints, windowDays, foodLogCoverage, formulaTdee, previousBlendedTdee } = input;

  if (
    windowDays < MIN_DAYS ||
    weightPoints.length < MIN_WEIGHT_ENTRIES ||
    foodLogCoverage < MIN_FOOD_LOG_COVERAGE
  ) {
    return {
      eligible: false,
      reason: "insufficient_data",
      observedTdee: null,
      blendedTdee: formulaTdee,
      confidence: 0,
      weightTrendKg: null,
    };
  }

  const trend = computeWeightTrend(weightPoints);
  const weightTrendKg = trend[trend.length - 1] - trend[0];

  const avgIntake =
    dailyIntakeKcal.reduce((sum, v) => sum + v, 0) / Math.max(dailyIntakeKcal.length, 1);

  const observedTdee = avgIntake - (weightTrendKg * KCAL_PER_KG) / windowDays;

  // Confidence / blend weight grows with data completeness, capped at MAX_BLEND_WEIGHT.
  const dataCompleteness = Math.min(
    1,
    (weightPoints.length / (windowDays * (MIN_WEIGHT_ENTRIES / MIN_DAYS))) * foodLogCoverage,
  );
  const confidence = Math.min(MAX_BLEND_WEIGHT, dataCompleteness * MAX_BLEND_WEIGHT);

  let blendedTdee = confidence * observedTdee + (1 - confidence) * formulaTdee;

  if (previousBlendedTdee != null) {
    const delta = blendedTdee - previousBlendedTdee;
    const cappedDelta = Math.max(-MAX_WEEKLY_CHANGE_KCAL, Math.min(MAX_WEEKLY_CHANGE_KCAL, delta));
    blendedTdee = previousBlendedTdee + cappedDelta;
  }

  return {
    eligible: true,
    observedTdee: Math.round(observedTdee),
    blendedTdee: Math.round(blendedTdee),
    confidence: Math.round(confidence * 100) / 100,
    weightTrendKg: Math.round(weightTrendKg * 100) / 100,
  };
}
