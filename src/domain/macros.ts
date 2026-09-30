/**
 * §6.6 – Protein coupled to training, fat as a percentage, carbs as remainder.
 *
 * Design note: macros are computed against the *total* daily limit
 * (baseKcal + workoutBonusKcal, see targets.ts §6.4), while protein depends
 * only on bodyweight/training-day-type and fat is a fixed 25% of total kcal
 * (with a bodyweight-based floor). Because protein is fixed in grams and fat
 * is a percentage, the majority of any workout bonus (75% of it, since fat
 * only claims 25%) flows into carbs — matching PLAN §6.4's "the extra bonus
 * flows mostly into carbohydrates". Call calculateMacros with the *total*
 * limit for the day, not just baseKcal.
 */

export const REST_DAY_PROTEIN_G_PER_KG = 1.6;
export const STRENGTH_DAY_PROTEIN_G_PER_KG = 2.0;
export const DEFICIT_PROTEIN_BONUS_G_PER_KG = 0.2;
export const MAX_PROTEIN_G_PER_KG = 2.4;

export const FAT_PERCENT_OF_KCAL = 0.25;
export const MIN_FAT_G_PER_KG = 0.6;

export const KCAL_PER_G_PROTEIN = 4;
export const KCAL_PER_G_CARB = 4;
export const KCAL_PER_G_FAT = 9;

export interface MacroInput {
  /** the full daily kcal limit, including any workout bonus */
  totalKcal: number;
  weightKg: number;
  /** true on a strength-training day, false on a rest day */
  isStrengthDay: boolean;
  /** true when the base target is a caloric deficit (goal = lose) */
  isDeficit: boolean;
}

export interface MacroResult {
  proteinG: number;
  fatG: number;
  carbsG: number;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculateMacros(input: MacroInput): MacroResult {
  const { totalKcal, weightKg, isStrengthDay, isDeficit } = input;

  let proteinPerKg = isStrengthDay
    ? STRENGTH_DAY_PROTEIN_G_PER_KG
    : REST_DAY_PROTEIN_G_PER_KG;
  if (isDeficit) proteinPerKg += DEFICIT_PROTEIN_BONUS_G_PER_KG;
  proteinPerKg = Math.min(proteinPerKg, MAX_PROTEIN_G_PER_KG);
  const proteinG = proteinPerKg * weightKg;

  const fatFromPercent = (totalKcal * FAT_PERCENT_OF_KCAL) / KCAL_PER_G_FAT;
  const fatFromFloor = MIN_FAT_G_PER_KG * weightKg;
  const fatG = Math.max(fatFromPercent, fatFromFloor);

  const remainingKcal =
    totalKcal - proteinG * KCAL_PER_G_PROTEIN - fatG * KCAL_PER_G_FAT;
  const carbsG = Math.max(0, remainingKcal / KCAL_PER_G_CARB);

  return {
    proteinG: round1(proteinG),
    fatG: round1(fatG),
    carbsG: round1(carbsG),
  };
}
