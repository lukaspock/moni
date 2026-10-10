import {
  buildIngredientCatalog,
  clampLogPortions,
  findCatalogEntry,
  parseIngredientLine,
  clampServings,
  formatPortions,
  ingredientFromCatalog,
  isRecipeItems,
  parseFavoriteItems,
  perServing,
  recipeIngredientsFromItems,
  recipeKcalForPortions,
  roundOneDecimal,
  scaleRecipeForLog,
  searchIngredientCatalog,
  serializeRecipeItems,
  stepLogPortions,
  sumRecipe,
  type RecipeIngredient,
} from './recipe';

const oats: RecipeIngredient = {
  name: 'Haferflocken',
  grams: 200,
  kcal: 744,
  proteinG: 27,
  carbsG: 117,
  fatG: 13.4,
};
const milk: RecipeIngredient = {
  name: 'Milch',
  grams: 500,
  kcal: 320,
  proteinG: 17,
  carbsG: 24,
  fatG: 17.5,
  barcode: '4000000000000',
};

describe('sumRecipe / perServing', () => {
  it('sums all ingredients and divides by servings', () => {
    const totals = sumRecipe([oats, milk]);
    expect(totals).toEqual({
      grams: 700,
      kcal: 1064,
      proteinG: 44,
      carbsG: 141,
      fatG: 30.9,
    });
    const p = perServing(totals, 4);
    expect(p.kcal).toBe(266);
    expect(p.grams).toBe(175);
    expect(p.fatG).toBeCloseTo(7.725);
  });

  it('never divides by less than one serving', () => {
    expect(perServing(sumRecipe([oats]), 0).kcal).toBe(744);
  });

  it('returns zeros for an empty recipe', () => {
    expect(sumRecipe([])).toEqual({
      grams: 0,
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });
});

describe('servings and portions', () => {
  it('clamps servings to integers 1–20', () => {
    expect(clampServings(0)).toBe(1);
    expect(clampServings(2.4)).toBe(2);
    expect(clampServings(99)).toBe(20);
    expect(clampServings(NaN)).toBe(1);
  });

  it('clamps log portions to 0.25–4 in 0.25 steps', () => {
    expect(clampLogPortions(0)).toBe(0.25);
    expect(clampLogPortions(1.3)).toBe(1.25);
    expect(clampLogPortions(1.4)).toBe(1.5);
    expect(clampLogPortions(9)).toBe(4);
    expect(clampLogPortions(NaN)).toBe(1);
  });

  it('steps portions and stops at the bounds', () => {
    expect(stepLogPortions(1, 1)).toBe(1.25);
    expect(stepLogPortions(0.25, -1)).toBe(0.25);
    expect(stepLogPortions(4, 1)).toBe(4);
  });

  it('formats portions with fraction glyphs', () => {
    expect(formatPortions(0.5)).toBe('½');
    expect(formatPortions(0.25)).toBe('¼');
    expect(formatPortions(1.5)).toBe('1½');
    expect(formatPortions(2.75)).toBe('2¾');
    expect(formatPortions(2)).toBe('2');
    expect(formatPortions(1.3, ',')).toBe('1,3');
  });
});

describe('serialization (favorite_meals.items)', () => {
  it('stores ingredients per serving in the plain favorite format plus recipe meta', () => {
    const json = serializeRecipeItems([oats, milk], { servings: 4 });
    expect(json).toEqual([
      {
        name: 'Haferflocken',
        grams: 50,
        kcal: 186,
        protein_g: 6.8,
        carbs_g: 29.3,
        fat_g: 3.4,
        recipe: { servings: 4 },
      },
      {
        name: 'Milch',
        grams: 125,
        kcal: 80,
        protein_g: 4.3,
        carbs_g: 6,
        fat_g: 4.4,
        barcode: '4000000000000',
        recipe: { servings: 4 },
      },
    ]);
  });

  it('keeps totalGrams only when positive', () => {
    expect(
      serializeRecipeItems([oats], { servings: 2, totalGrams: 650.04 })[0]!
        .recipe,
    ).toEqual({ servings: 2, totalGrams: 650 });
    expect(
      serializeRecipeItems([oats], { servings: 2, totalGrams: 0 })[0]!.recipe,
    ).toEqual({ servings: 2 });
  });

  it('round-trips through parse + recipeIngredientsFromItems (within rounding)', () => {
    const json = serializeRecipeItems([oats, milk], { servings: 4 });
    const parsed = parseFavoriteItems(JSON.parse(JSON.stringify(json)));
    expect(parsed.recipe).toEqual({ servings: 4 });
    const whole = recipeIngredientsFromItems(parsed.items, 4);
    expect(whole[0]!.grams).toBe(200);
    expect(whole[0]!.kcal).toBe(744);
    expect(whole[1]!.barcode).toBe('4000000000000');
    expect(Math.abs(whole[1]!.fatG - 17.5)).toBeLessThanOrEqual(0.2);
  });

  it('reads plain favorites (no meta) as non-recipes', () => {
    const plain = [
      {
        name: 'Toast',
        grams: 60,
        kcal: 160,
        protein_g: 5,
        carbs_g: 30,
        fat_g: 2,
      },
    ];
    expect(parseFavoriteItems(plain).recipe).toBeNull();
    expect(parseFavoriteItems(plain).items[0]!.kcal).toBe(160);
    expect(isRecipeItems(plain)).toBe(false);
    expect(isRecipeItems(serializeRecipeItems([oats], { servings: 1 }))).toBe(
      true,
    );
  });

  it('is defensive against malformed json', () => {
    expect(parseFavoriteItems(null)).toEqual({ items: [], recipe: null });
    expect(parseFavoriteItems({ a: 1 })).toEqual({ items: [], recipe: null });
    const parsed = parseFavoriteItems([
      null,
      { name: 3, kcal: 'x', recipe: { servings: -1 } },
    ]);
    expect(parsed.recipe).toBeNull();
    expect(parsed.items).toEqual([
      {
        name: '',
        grams: 0,
        kcal: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        barcode: null,
      },
    ]);
  });
});

describe('logging', () => {
  const perServingItems = parseFavoriteItems(
    serializeRecipeItems([oats, milk], { servings: 4 }),
  ).items;

  it('scales per-serving items to the logged portions', () => {
    const scaled = scaleRecipeForLog(perServingItems, 1.5);
    expect(scaled[0]!.grams).toBe(75);
    expect(scaled[0]!.kcal).toBe(279);
    expect(scaled[1]!.grams).toBe(187.5);
  });

  it('clamps out-of-range portions when scaling', () => {
    expect(scaleRecipeForLog(perServingItems, 10)[0]!.grams).toBe(200);
  });

  it('computes rounded kcal for portions', () => {
    expect(recipeKcalForPortions(perServingItems, 1)).toBe(266);
    expect(recipeKcalForPortions(perServingItems, 0.5)).toBe(133);
  });

  it('rounds to one decimal', () => {
    expect(roundOneDecimal(1.25)).toBe(1.3);
    expect(roundOneDecimal(Infinity)).toBe(0);
  });
});

describe('ingredient catalog', () => {
  const sources: RecipeIngredient[] = [
    oats,
    milk,
    { ...oats, name: ' haferflocken ', grams: 50, kcal: 186 },
    { ...milk, name: 'Hafermilch' },
    { ...milk, name: 'Wasser', grams: 0 },
    { ...milk, name: '' },
  ];

  it('dedupes by name (most recent wins), normalises to 100 g, skips unusable rows', () => {
    const catalog = buildIngredientCatalog(sources);
    expect(catalog.map((e) => e.name)).toEqual([
      'Haferflocken',
      'Milch',
      'Hafermilch',
    ]);
    expect(catalog[0]!.count).toBe(2);
    expect(catalog[0]!.grams).toBe(200);
    expect(catalog[0]!.per100g.kcal).toBe(372);
  });

  it('searches by words, prefix matches first, then usage', () => {
    const catalog = buildIngredientCatalog(sources);
    expect(
      searchIngredientCatalog(catalog, 'hafer').map((e) => e.name),
    ).toEqual(['Haferflocken', 'Hafermilch']);
    expect(
      searchIngredientCatalog(catalog, 'milch').map((e) => e.name),
    ).toEqual(['Milch', 'Hafermilch']);
    expect(searchIngredientCatalog(catalog, '', 1).map((e) => e.name)).toEqual([
      'Haferflocken',
    ]);
    expect(searchIngredientCatalog(catalog, 'xyz')).toEqual([]);
  });

  it('builds an ingredient for a chosen amount', () => {
    const [entry] = buildIngredientCatalog([oats]);
    expect(ingredientFromCatalog(entry!, 50)).toEqual({
      name: 'Haferflocken',
      grams: 50,
      kcal: 186,
      proteinG: 6.8,
      carbsG: 29.3,
      fatG: 3.4,
      barcode: null,
    });
    expect(ingredientFromCatalog(entry!).grams).toBe(200);
  });
});

describe('parseIngredientLine / findCatalogEntry', () => {
  it('parses leading and trailing amounts', () => {
    expect(parseIngredientLine('200 g Haferflocken')).toEqual({
      grams: 200,
      name: 'Haferflocken',
    });
    expect(parseIngredientLine('Haferflocken 200g')).toEqual({
      grams: 200,
      name: 'Haferflocken',
    });
    expect(parseIngredientLine('1,5 kg  Kartoffeln')).toEqual({
      grams: 1500,
      name: 'Kartoffeln',
    });
    expect(parseIngredientLine('250ml Milch')).toEqual({
      grams: 250,
      name: 'Milch',
    });
  });

  it('returns null without an amount', () => {
    expect(parseIngredientLine('eine Banane')).toBeNull();
    expect(parseIngredientLine('0 g Salz')).toBeNull();
    expect(parseIngredientLine('')).toBeNull();
  });

  it('finds exact catalog entries case-insensitively', () => {
    const catalog = buildIngredientCatalog([oats, milk]);
    expect(findCatalogEntry(catalog, ' milch ')?.name).toBe('Milch');
    expect(findCatalogEntry(catalog, 'Hafer')).toBeNull();
  });
});
