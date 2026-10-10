import { sumFoodItems, type FoodItemMacros } from './food';

/**
 * Own dishes / recipes (no migration): a recipe is stored as an ordinary `favorite_meals`
 * row whose `items` jsonb holds the ingredients **per serving** in the existing favorite item
 * format (`{ name, grams, kcal, protein_g, carbs_g, fat_g }`), plus an additive
 * `recipe: { servings, totalGrams? }` on every item. Older code that only knows the plain
 * favorite format therefore keeps working and simply logs one serving.
 */

/** One ingredient (whole-recipe amount in the editor, per-serving amount in storage). */
export interface RecipeIngredient extends FoodItemMacros {
  name: string;
  barcode?: string | null;
}

export interface RecipeMeta {
  /** Number of servings the whole recipe yields (integer, 1–20). */
  servings: number;
  /** Optional finished weight of the whole recipe in grams. */
  totalGrams?: number;
}

/** Item format of `favorite_meals.items` (snake_case, compatible with plain favorites). */
export interface FavoriteItemJson {
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  barcode?: string | null;
  /** Only present on recipes; identical on every item of the row. */
  recipe?: RecipeMeta;
}

export const RECIPE_MIN_SERVINGS = 1;
export const RECIPE_MAX_SERVINGS = 20;

/** Servings eaten when logging a recipe. */
export const RECIPE_MIN_LOG_PORTIONS = 0.25;
export const RECIPE_MAX_LOG_PORTIONS = 4;
export const RECIPE_LOG_PORTION_STEP = 0.25;
/** Quick chips on log-food: ½ / 1 / 1½ / 2. */
export const RECIPE_LOG_PORTION_PRESETS: readonly number[] = [0.5, 1, 1.5, 2];

/** Rounds to one decimal (storage precision for grams and macros). */
export function roundOneDecimal(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

export function clampServings(value: number): number {
  if (!Number.isFinite(value)) return RECIPE_MIN_SERVINGS;
  return Math.min(
    RECIPE_MAX_SERVINGS,
    Math.max(RECIPE_MIN_SERVINGS, Math.round(value)),
  );
}

/** Clamps to 0.25–4 and snaps to the 0.25 step. */
export function clampLogPortions(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const snapped =
    Math.round(value / RECIPE_LOG_PORTION_STEP) * RECIPE_LOG_PORTION_STEP;
  return Math.min(
    RECIPE_MAX_LOG_PORTIONS,
    Math.max(RECIPE_MIN_LOG_PORTIONS, snapped),
  );
}

/** One stepper tick (direction ±1) on the log portions. */
export function stepLogPortions(value: number, direction: 1 | -1): number {
  return clampLogPortions(value + direction * RECIPE_LOG_PORTION_STEP);
}

/** Short portion label: 0.5 -> "½", 1.5 -> "1½", 0.25 -> "¼", 2 -> "2", 1.3 -> "1.3". */
export function formatPortions(value: number, decimalSeparator = '.'): string {
  const whole = Math.floor(value + 1e-9);
  const frac = Math.round((value - whole) * 100) / 100;
  const glyph =
    frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : null;
  if (frac === 0) return String(whole);
  if (glyph) return whole === 0 ? glyph : `${whole}${glyph}`;
  return String(roundOneDecimal(value)).replace('.', decimalSeparator);
}

/** Sum of all ingredients (grams included). */
export function sumRecipe(ingredients: FoodItemMacros[]): FoodItemMacros {
  return sumFoodItems(ingredients);
}

/** Whole-recipe totals divided by the number of servings. */
export function perServing(
  totals: FoodItemMacros,
  servings: number,
): FoodItemMacros {
  const n = clampServings(servings);
  return {
    grams: totals.grams / n,
    kcal: totals.kcal / n,
    proteinG: totals.proteinG / n,
    carbsG: totals.carbsG / n,
    fatG: totals.fatG / n,
  };
}

function scaleIngredient<T extends RecipeIngredient>(
  item: T,
  factor: number,
): T {
  return {
    ...item,
    grams: roundOneDecimal(item.grams * factor),
    kcal: roundOneDecimal(item.kcal * factor),
    proteinG: roundOneDecimal(item.proteinG * factor),
    carbsG: roundOneDecimal(item.carbsG * factor),
    fatG: roundOneDecimal(item.fatG * factor),
  };
}

/** Whole-recipe ingredients -> `favorite_meals.items` (per serving, rounded, with meta). */
export function serializeRecipeItems(
  ingredients: RecipeIngredient[],
  meta: RecipeMeta,
): FavoriteItemJson[] {
  const servings = clampServings(meta.servings);
  const recipe: RecipeMeta =
    meta.totalGrams != null && meta.totalGrams > 0
      ? { servings, totalGrams: roundOneDecimal(meta.totalGrams) }
      : { servings };
  return ingredients.map((ingredient) => {
    const p = scaleIngredient(ingredient, 1 / servings);
    const json: FavoriteItemJson = {
      name: p.name.trim(),
      grams: p.grams,
      kcal: p.kcal,
      protein_g: p.proteinG,
      carbs_g: p.carbsG,
      fat_g: p.fatG,
      recipe,
    };
    if (ingredient.barcode) json.barcode = ingredient.barcode;
    return json;
  });
}

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseMeta(value: unknown): RecipeMeta | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as { servings?: unknown; totalGrams?: unknown };
  const servings = num(raw.servings);
  if (servings <= 0) return null;
  const totalGrams = num(raw.totalGrams);
  return totalGrams > 0
    ? { servings: clampServings(servings), totalGrams }
    : { servings: clampServings(servings) };
}

/**
 * Reads any `favorite_meals.items` value defensively. `items` are the stored values (per
 * serving for recipes, whole meal for plain favorites); `recipe` is null for plain favorites.
 */
export function parseFavoriteItems(json: unknown): {
  items: RecipeIngredient[];
  recipe: RecipeMeta | null;
} {
  if (!Array.isArray(json)) return { items: [], recipe: null };
  let recipe: RecipeMeta | null = null;
  const items: RecipeIngredient[] = [];
  for (const entry of json) {
    if (!entry || typeof entry !== 'object') continue;
    const raw = entry as Record<string, unknown>;
    recipe = recipe ?? parseMeta(raw.recipe);
    items.push({
      name: typeof raw.name === 'string' ? raw.name : '',
      grams: num(raw.grams),
      kcal: num(raw.kcal),
      proteinG: num(raw.protein_g),
      carbsG: num(raw.carbs_g),
      fatG: num(raw.fat_g),
      barcode: typeof raw.barcode === 'string' ? raw.barcode : null,
    });
  }
  return { items, recipe };
}

export function isRecipeItems(json: unknown): boolean {
  return parseFavoriteItems(json).recipe != null;
}

/** Stored per-serving items -> whole-recipe ingredients for the editor. */
export function recipeIngredientsFromItems(
  perServingItems: RecipeIngredient[],
  servings: number,
): RecipeIngredient[] {
  return perServingItems.map((item) =>
    scaleIngredient(item, clampServings(servings)),
  );
}

/** Per-serving items scaled to the logged portions (0.25–4), rounded to one decimal. */
export function scaleRecipeForLog<T extends RecipeIngredient>(
  perServingItems: T[],
  portions: number,
): T[] {
  const factor = clampLogPortions(portions);
  return perServingItems.map((item) => scaleIngredient(item, factor));
}

/** kcal of `portions` servings, rounded to whole kcal (what the log row will store). */
export function recipeKcalForPortions(
  perServingItems: FoodItemMacros[],
  portions: number,
): number {
  return Math.round(
    sumFoodItems(perServingItems).kcal * clampLogPortions(portions),
  );
}

/** A previously logged ingredient that can be re-used, normalised to 100 g. */
export interface IngredientCatalogEntry {
  name: string;
  /** Amount it was last used with (suggested default). */
  grams: number;
  per100g: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  barcode: string | null;
  /** How often it appears in the sources. */
  count: number;
}

const normalizeName = (name: string) => name.trim().toLowerCase();

/**
 * Builds a de-duplicated ingredient catalog from logged items / favorite items (most recent
 * first in `sources`). Items without grams can't be scaled and are skipped; the first
 * (= most recent) occurrence of a name wins, later ones only raise `count`.
 */
export function buildIngredientCatalog(
  sources: RecipeIngredient[],
): IngredientCatalogEntry[] {
  const byName = new Map<string, IngredientCatalogEntry>();
  for (const item of sources) {
    const key = normalizeName(item.name);
    if (!key || item.grams <= 0) continue;
    const existing = byName.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    const f = 100 / item.grams;
    byName.set(key, {
      name: item.name.trim(),
      grams: roundOneDecimal(item.grams),
      per100g: {
        kcal: item.kcal * f,
        proteinG: item.proteinG * f,
        carbsG: item.carbsG * f,
        fatG: item.fatG * f,
      },
      barcode: item.barcode ?? null,
      count: 1,
    });
  }
  return [...byName.values()];
}

/**
 * Filters the catalog by a query (every word must appear in the name); prefix matches
 * first, then by usage count. Empty query = most used entries.
 */
export function searchIngredientCatalog(
  catalog: IngredientCatalogEntry[],
  query: string,
  limit = 8,
): IngredientCatalogEntry[] {
  const words = normalizeName(query).split(/\s+/).filter(Boolean);
  const matches = catalog.filter((entry) => {
    const name = normalizeName(entry.name);
    return words.every((w) => name.includes(w));
  });
  const first = words[0] ?? '';
  return matches
    .map((entry, index) => ({
      entry,
      index,
      prefix: first && normalizeName(entry.name).startsWith(first) ? 1 : 0,
    }))
    .sort(
      (a, b) =>
        b.prefix - a.prefix ||
        b.entry.count - a.entry.count ||
        a.index - b.index,
    )
    .slice(0, limit)
    .map(({ entry }) => entry);
}

/** Catalog entry -> ingredient with `grams` (rounded to one decimal). */
export function ingredientFromCatalog(
  entry: IngredientCatalogEntry,
  grams: number = entry.grams,
): RecipeIngredient {
  const f = Math.max(0, grams) / 100;
  return {
    name: entry.name,
    grams: roundOneDecimal(Math.max(0, grams)),
    kcal: roundOneDecimal(entry.per100g.kcal * f),
    proteinG: roundOneDecimal(entry.per100g.proteinG * f),
    carbsG: roundOneDecimal(entry.per100g.carbsG * f),
    fatG: roundOneDecimal(entry.per100g.fatG * f),
    barcode: entry.barcode,
  };
}

/**
 * Parses a free-text ingredient line like "200 g Haferflocken", "Haferflocken 200g" or
 * "1,5 kg Kartoffeln" into grams + name (ml counts as g). Null when no amount is found.
 */
export function parseIngredientLine(
  text: string,
): { grams: number; name: string } | null {
  const line = text.trim().replace(/\s+/g, ' ');
  const unit = '(kg|g|gr|gramm|grams?|ml|l)';
  const lead = line.match(
    new RegExp(`^(\\d+(?:[.,]\\d+)?) ?${unit}\\.? (.+)$`, 'i'),
  );
  const trail = line.match(
    new RegExp(`^(.+?) (\\d+(?:[.,]\\d+)?) ?${unit}\\.?$`, 'i'),
  );
  const amount = lead ? lead[1] : trail?.[2];
  const u = (lead ? lead[2] : trail?.[3])?.toLowerCase();
  const name = (lead ? lead[3] : trail?.[1])?.trim();
  if (!amount || !u || !name) return null;
  const value = Number(amount.replace(',', '.'));
  const grams = u === 'kg' || u === 'l' ? value * 1000 : value;
  if (!(grams > 0)) return null;
  return { grams: roundOneDecimal(grams), name };
}

/** Exact (case-insensitive) catalog match for a parsed name, if any. */
export function findCatalogEntry(
  catalog: IngredientCatalogEntry[],
  name: string,
): IngredientCatalogEntry | null {
  const key = normalizeName(name);
  return catalog.find((entry) => normalizeName(entry.name) === key) ?? null;
}
