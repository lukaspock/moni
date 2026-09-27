/**
 * §7.2 / §7.3 – food item scaling, totals, and the plausibility check
 * (same logic the `analyze-food` edge function uses server-side).
 */

export interface FoodItemMacros {
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Scales a food item's macros linearly to a new gram amount. */
export function scaleFoodItem(item: FoodItemMacros, newGrams: number): FoodItemMacros {
  if (item.grams <= 0) {
    return { ...item, grams: newGrams };
  }
  const factor = newGrams / item.grams;
  return {
    grams: newGrams,
    kcal: item.kcal * factor,
    proteinG: item.proteinG * factor,
    carbsG: item.carbsG * factor,
    fatG: item.fatG * factor,
  };
}

export function sumFoodItems(items: FoodItemMacros[]): FoodItemMacros {
  return items.reduce<FoodItemMacros>(
    (acc, item) => ({
      grams: acc.grams + item.grams,
      kcal: acc.kcal + item.kcal,
      proteinG: acc.proteinG + item.proteinG,
      carbsG: acc.carbsG + item.carbsG,
      fatG: acc.fatG + item.fatG,
    }),
    { grams: 0, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export const KCAL_PLAUSIBILITY_TOLERANCE = 0.15;

export function computeKcalFromMacros(proteinG: number, carbsG: number, fatG: number): number {
  return proteinG * 4 + carbsG * 4 + fatG * 9;
}

/** §7.3 step 5: kcal ≈ 4·protein + 4·carbs + 9·fat, within ±15%. */
export function isKcalPlausible(
  kcal: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  tolerance: number = KCAL_PLAUSIBILITY_TOLERANCE,
): boolean {
  const computed = computeKcalFromMacros(proteinG, carbsG, fatG);
  if (computed === 0) return kcal === 0;
  const diff = Math.abs(kcal - computed) / computed;
  return diff <= tolerance;
}
