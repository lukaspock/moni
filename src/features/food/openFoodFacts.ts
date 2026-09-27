/** §7.5 barcode flow: Open Food Facts lookup. Client-side, does not count toward the AI limit. */
export interface OpenFoodFactsProduct {
  barcode: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  /** e.g. "250g" or "1 portion (30g)" — informational only, not parsed into grams. */
  servingSize: string | null;
}

interface OpenFoodFactsResponse {
  status: number;
  product?: {
    product_name?: string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      proteins_100g?: number;
      carbohydrates_100g?: number;
      fat_100g?: number;
    };
    serving_size?: string;
  };
}

const FIELDS = 'product_name,nutriments,serving_size';

/** Returns `null` when the product is not found. */
export async function lookupBarcode(code: string): Promise<OpenFoodFactsProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const json = (await response.json()) as OpenFoodFactsResponse;
  if (json.status !== 1 || !json.product) return null;

  const n = json.product.nutriments ?? {};
  return {
    barcode: code,
    name: json.product.product_name?.trim() || code,
    kcalPer100g: n['energy-kcal_100g'] ?? 0,
    proteinPer100g: n.proteins_100g ?? 0,
    carbsPer100g: n.carbohydrates_100g ?? 0,
    fatPer100g: n.fat_100g ?? 0,
    servingSize: json.product.serving_size?.trim() || null,
  };
}
