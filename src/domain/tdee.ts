import type { ActivityLevel } from './types';

/**
 * §6.2 – Base TDEE (no exercise).
 * Base TDEE = BMR × NEAT factor. The factor accounts for everyday activity
 * (NEAT) only — workouts are added separately (see targets.ts §6.4) so they
 * are never double-counted.
 */
export const NEAT_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.5,
  active: 1.65,
};

export function calculateBaseTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * NEAT_FACTORS[activityLevel];
}
