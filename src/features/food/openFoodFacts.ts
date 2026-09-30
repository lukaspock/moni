import { hasNutritionData, kcalFromKj, parseServingGrams } from '@/domain';

/** §7.5 barcode flow: Open Food Facts lookup. Client-side, does not count toward the AI limit. */
export interface OpenFoodFactsProduct {
  barcode: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  /** e.g. "250g" or "1 portion (30g)" — raw text. */
  servingSize: string | null;
  /** Serving weight in grams, when Open Food Facts knows it. */
  servingGrams: number | null;
  /** false when the product exists but carries no nutrition values (-> offer label scan). */
  hasNutrition: boolean;
}

export type BarcodeLookupResult =
  | { status: 'found'; product: OpenFoodFactsProduct }
  | { status: 'not_found' }
  | { status: 'error' };

interface OpenFoodFactsResponse {
  status: number;
  product?: {
    product_name?: string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      energy_100g?: number;
      proteins_100g?: number;
      carbohydrates_100g?: number;
      fat_100g?: number;
    };
    serving_size?: string;
    serving_quantity?: number | string;
  };
}

const FIELDS = 'product_name,nutriments,serving_size,serving_quantity';

const LOOKUP_TIMEOUT_MS = 8000;

/**
 * Looks a barcode up. Never throws: network problems/timeouts yield `{ status: 'error' }`,
 * an unknown product `{ status: 'not_found' }`, so the scanner can offer fallbacks instead of freezing.
 */
export async function lookupBarcode(
  code: string,
): Promise<BarcodeLookupResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) return { status: 'not_found' };
    if (!response.ok) return { status: 'error' };

    const json = (await response.json()) as OpenFoodFactsResponse;
    if (json.status !== 1 || !json.product) return { status: 'not_found' };

    const n = json.product.nutriments ?? {};
    const kcal =
      n['energy-kcal_100g'] ??
      (n.energy_100g != null ? kcalFromKj(n.energy_100g) : 0);
    const per100g = {
      kcal,
      proteinG: n.proteins_100g ?? 0,
      carbsG: n.carbohydrates_100g ?? 0,
      fatG: n.fat_100g ?? 0,
    };
    const servingSize = json.product.serving_size?.trim() || null;
    const quantity = Number(json.product.serving_quantity);
    return {
      status: 'found',
      product: {
        barcode: code,
        name: json.product.product_name?.trim() || code,
        kcalPer100g: per100g.kcal,
        proteinPer100g: per100g.proteinG,
        carbsPer100g: per100g.carbsG,
        fatPer100g: per100g.fatG,
        servingSize,
        servingGrams: quantity > 0 ? quantity : parseServingGrams(servingSize),
        hasNutrition: hasNutritionData(per100g),
      },
    };
  } catch {
    return { status: 'error' };
  } finally {
    clearTimeout(timer);
  }
}
