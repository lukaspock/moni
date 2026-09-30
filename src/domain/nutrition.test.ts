import {
  clampPortionMultiplier,
  hasNutritionData,
  kcalFromKj,
  macrosForGrams,
  parseServingGrams,
  quantityPresets,
  scaleFoodItems,
} from './nutrition';

describe('scaleFoodItems', () => {
  it('scales grams and macros together', () => {
    const [scaled] = scaleFoodItems(
      [{ grams: 100, kcal: 200, proteinG: 10, carbsG: 20, fatG: 5 }],
      1.5,
    );
    expect(scaled).toEqual({
      grams: 150,
      kcal: 300,
      proteinG: 15,
      carbsG: 30,
      fatG: 7.5,
    });
  });
  it('returns the same array for factor 1', () => {
    const items = [{ grams: 100, kcal: 1, proteinG: 1, carbsG: 1, fatG: 1 }];
    expect(scaleFoodItems(items, 1)).toBe(items);
  });
});

describe('clampPortionMultiplier', () => {
  it('clamps and guards NaN', () => {
    expect(clampPortionMultiplier(10)).toBe(3);
    expect(clampPortionMultiplier(0)).toBe(0.25);
    expect(clampPortionMultiplier(NaN)).toBe(1);
  });
});

describe('macrosForGrams', () => {
  it('computes from per-100g values', () => {
    const r = macrosForGrams(
      { kcal: 400, proteinG: 10, carbsG: 60, fatG: 12 },
      30,
    );
    expect(r.kcal).toBeCloseTo(120);
    expect(r.proteinG).toBeCloseTo(3);
    expect(r.grams).toBe(30);
  });
  it('never returns negative grams', () => {
    expect(
      macrosForGrams({ kcal: 100, proteinG: 1, carbsG: 1, fatG: 1 }, -5).kcal,
    ).toBe(0);
  });
});

describe('parseServingGrams', () => {
  it.each([
    ['30 g', 30],
    ['1 portion (30g)', 30],
    ['250ml', 250],
    ['2 x 15,5 g', 31],
    ['12.5 g', 12.5],
  ])('parses %s', (text, expected) => {
    expect(parseServingGrams(text)).toBe(expected);
  });
  it('returns null for unusable text', () => {
    expect(parseServingGrams('1 slice')).toBeNull();
    expect(parseServingGrams(null)).toBeNull();
    expect(parseServingGrams('0 g')).toBeNull();
  });
});

describe('kcalFromKj / hasNutritionData / quantityPresets', () => {
  it('converts kJ', () => expect(kcalFromKj(418.4)).toBeCloseTo(100));
  it('detects empty nutrition', () => {
    expect(hasNutritionData({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 })).toBe(
      false,
    );
    expect(hasNutritionData({ kcal: 0, proteinG: 1, carbsG: 0, fatG: 0 })).toBe(
      true,
    );
  });
  it('puts the serving first and dedupes', () => {
    expect(quantityPresets(30)).toEqual([30, 50, 100, 150, 200]);
    expect(quantityPresets(100)).toEqual([100, 50, 150, 200]);
    expect(quantityPresets(null)).toEqual([50, 100, 150, 200]);
  });
});
