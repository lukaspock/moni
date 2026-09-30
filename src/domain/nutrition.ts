import type { FoodItemMacros } from './food';

/**
 * Quick-log helpers: portion presets, per-100g math, serving parsing
 * (used by barcode lookups, nutrition-label scans and the review screen).
 */

/** Portion multiplier presets offered on the review screen (½, 1×, 1.5×, 2×). */
export const PORTION_PRESETS: readonly number[] = [0.5, 1, 1.5, 2];

export const MIN_PORTION_MULTIPLIER = 0.25;
export const MAX_PORTION_MULTIPLIER = 3;

export function clampPortionMultiplier(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(
    MAX_PORTION_MULTIPLIER,
    Math.max(MIN_PORTION_MULTIPLIER, value),
  );
}

/** Scales every item by `factor` — grams included, so saved grams match the saved macros. */
export function scaleFoodItems<T extends FoodItemMacros>(
  items: T[],
  factor: number,
): T[] {
  if (factor === 1) return items;
  return items.map((item) => ({
    ...item,
    grams: item.grams * factor,
    kcal: item.kcal * factor,
    proteinG: item.proteinG * factor,
    carbsG: item.carbsG * factor,
    fatG: item.fatG * factor,
  }));
}

/** Nutrition values per 100 g (what packaging and Open Food Facts report). */
export interface MacrosPer100g {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function macrosForGrams(
  per100g: MacrosPer100g,
  grams: number,
): FoodItemMacros {
  const g = Math.max(0, grams);
  const factor = g / 100;
  return {
    grams: g,
    kcal: per100g.kcal * factor,
    proteinG: per100g.proteinG * factor,
    carbsG: per100g.carbsG * factor,
    fatG: per100g.fatG * factor,
  };
}

/** Energy in kJ -> kcal (some Open Food Facts products only carry kJ). */
export function kcalFromKj(kj: number): number {
  return kj / 4.184;
}

/**
 * Extracts the serving weight in grams from free text like "30 g", "1 portion (30g)",
 * "2 x 15,5 g" (-> 31) or "250 ml" (ml treated as g). Returns null when nothing usable.
 */
export function parseServingGrams(
  text: string | null | undefined,
): number | null {
  if (!text) return null;
  const normalized = text.toLowerCase().replace(',', '.');
  const multi = normalized.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:g|ml)\b/);
  if (multi) {
    const total = Number(multi[1]) * Number(multi[2]);
    return total > 0 ? total : null;
  }
  const single = normalized.match(/(\d+(?:\.\d+)?)\s*(?:g|gr|ml)\b/);
  if (single) {
    const value = Number(single[1]);
    return value > 0 ? value : null;
  }
  return null;
}

/** True when a per-100g set carries any information at all (all-zero = missing data). */
export function hasNutritionData(per100g: MacrosPer100g): boolean {
  return (
    per100g.kcal > 0 ||
    per100g.proteinG > 0 ||
    per100g.carbsG > 0 ||
    per100g.fatG > 0
  );
}

/** Quantity chips for a scanned product: the serving (if known) first, then round gram amounts. */
export function quantityPresets(servingGrams: number | null): number[] {
  const base = [50, 100, 150, 200];
  if (!servingGrams || servingGrams <= 0) return base;
  const serving = Math.round(servingGrams);
  return [serving, ...base.filter((g) => g !== serving)].slice(0, 5);
}
