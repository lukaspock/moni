/**
 * §6.5 – Workout energy expenditure (MET) and §7.4 progress metrics (1RM, volume).
 *
 * kcal = MET × kg × hours
 *
 * Strength-training MET is not a fixed catalog value: it is interpolated
 * from "session density" (completed sets per minute), because a dense
 * circuit-style session burns meaningfully more than the same sets spread
 * across long rest periods.
 *
 * Bounds (documented, tune later against real data):
 * - STRENGTH_DENSITY_MIN = 0.15 sets/min: a slow, heavy session with long
 *   rest (e.g. ~10 sets over 60 min) -> MET 3.5 (light resistance-training MET).
 * - STRENGTH_DENSITY_MAX = 0.6 sets/min: a fast circuit-style session with
 *   short rest (e.g. ~35+ sets over 60 min) -> MET 6.0 (vigorous
 *   resistance-training MET).
 * Density outside the range is clamped before interpolating linearly.
 */

export const STRENGTH_MET_MIN = 3.5;
export const STRENGTH_MET_MAX = 6.0;
export const STRENGTH_DENSITY_MIN = 0.15; // sets per minute
export const STRENGTH_DENSITY_MAX = 0.6; // sets per minute

export function calculateSessionDensity(
  totalSets: number,
  durationMinutes: number,
): number {
  if (durationMinutes <= 0) return 0;
  return totalSets / durationMinutes;
}

export function estimateStrengthMET(setsPerMinute: number): number {
  const clamped = Math.min(
    Math.max(setsPerMinute, STRENGTH_DENSITY_MIN),
    STRENGTH_DENSITY_MAX,
  );
  const t =
    (clamped - STRENGTH_DENSITY_MIN) /
    (STRENGTH_DENSITY_MAX - STRENGTH_DENSITY_MIN);
  return STRENGTH_MET_MIN + t * (STRENGTH_MET_MAX - STRENGTH_MET_MIN);
}

/** Generic MET-based energy expenditure, used for strength (estimated MET) and cardio/sport (catalog MET). */
export function calculateKcalBurned(
  metValue: number,
  weightKg: number,
  durationHours: number,
): number {
  return metValue * weightKg * durationHours;
}

/** §7.4 – estimated one-rep max. Both formulas are standard; Epley tends to run slightly higher at high reps. */
export function estimateOneRepMaxEpley(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function estimateOneRepMaxBrzycki(
  weightKg: number,
  reps: number,
): number {
  if (reps <= 1) return weightKg;
  return (weightKg * 36) / (37 - reps);
}

export interface SetVolumeInput {
  reps: number;
  weightKg: number;
}

/** Total tonnage lifted: Σ(reps × weight) across a set of a workout/exercise. */
export function calculateSetVolume(sets: SetVolumeInput[]): number {
  return sets.reduce((sum, s) => sum + s.reps * s.weightKg, 0);
}

/**
 * Longest session that is credited with energy expenditure. A workout left
 * running overnight (forgotten "finish") must not earn a thousands-of-kcal
 * eat-back bonus; the stored start/end still show the real duration.
 */
export const MAX_KCAL_DURATION_MINUTES = 4 * 60;

/** Fallback bodyweight (kg) when no weight has been logged yet. */
export const FALLBACK_WEIGHT_KG = 75;

/**
 * Guarded kcal estimate for a whole session: non-finite / non-positive inputs
 * give 0 (never NaN), the duration is capped at MAX_KCAL_DURATION_MINUTES and
 * a missing/invalid bodyweight falls back to FALLBACK_WEIGHT_KG. Rounded to
 * whole kcal.
 */
export function estimateWorkoutKcal(params: {
  metValue: number;
  weightKg: number | null | undefined;
  durationMinutes: number;
}): number {
  const { metValue, durationMinutes } = params;
  if (!Number.isFinite(metValue) || metValue <= 0) return 0;
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return 0;
  const weightKg =
    typeof params.weightKg === 'number' &&
    Number.isFinite(params.weightKg) &&
    params.weightKg > 0
      ? params.weightKg
      : FALLBACK_WEIGHT_KG;
  const minutes = Math.min(durationMinutes, MAX_KCAL_DURATION_MINUTES);
  return Math.round(calculateKcalBurned(metValue, weightKg, minutes / 60));
}

/**
 * §7.4 – Cardio/sport quick-entry MET when no catalog exercise (with its own
 * `met_value`) is picked: a coarse 3-level intensity the user selects
 * directly. Values are the "light/moderate/vigorous" tiers of the Compendium
 * of Physical Activities for generic aerobic exercise.
 */
export type CardioIntensity = 'light' | 'moderate' | 'vigorous';

const INTENSITY_MET: Record<CardioIntensity, number> = {
  light: 4,
  moderate: 6,
  vigorous: 9,
};

export function metForIntensity(intensity: CardioIntensity): number {
  return INTENSITY_MET[intensity];
}
