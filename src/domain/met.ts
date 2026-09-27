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

export function calculateSessionDensity(totalSets: number, durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return totalSets / durationMinutes;
}

export function estimateStrengthMET(setsPerMinute: number): number {
  const clamped = Math.min(Math.max(setsPerMinute, STRENGTH_DENSITY_MIN), STRENGTH_DENSITY_MAX);
  const t = (clamped - STRENGTH_DENSITY_MIN) / (STRENGTH_DENSITY_MAX - STRENGTH_DENSITY_MIN);
  return STRENGTH_MET_MIN + t * (STRENGTH_MET_MAX - STRENGTH_MET_MIN);
}

/** Generic MET-based energy expenditure, used for strength (estimated MET) and cardio/sport (catalog MET). */
export function calculateKcalBurned(metValue: number, weightKg: number, durationHours: number): number {
  return metValue * weightKg * durationHours;
}

/** §7.4 – estimated one-rep max. Both formulas are standard; Epley tends to run slightly higher at high reps. */
export function estimateOneRepMaxEpley(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function estimateOneRepMaxBrzycki(weightKg: number, reps: number): number {
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

/** Assumed length of a "typical" planned strength session when estimating a weekly-plan day's `expected_kcal`. */
export const TYPICAL_SESSION_DURATION_MINUTES = 45;

/**
 * Estimated kcal burn for a *planned* strength session, before it's actually
 * logged (PLAN §6.4/§7.4's `training_plan_days.expected_kcal`). Assumes a
 * typical session length and derives session density (and therefore MET)
 * from the routine's total target sets, same model as a completed session.
 */
export function estimatePlannedStrengthKcal(
  totalTargetSets: number,
  weightKg: number,
  durationMinutes: number = TYPICAL_SESSION_DURATION_MINUTES,
): number {
  const density = calculateSessionDensity(totalTargetSets, durationMinutes);
  const met = estimateStrengthMET(density);
  return calculateKcalBurned(met, weightKg, durationMinutes / 60);
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
