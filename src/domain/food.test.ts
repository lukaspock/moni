import {
  scaleFoodItem,
  sumFoodItems,
  isKcalPlausible,
  computeKcalFromMacros,
} from './food';

describe('scaleFoodItem', () => {
  it('scales macros linearly when grams change', () => {
    const item = { grams: 100, kcal: 200, proteinG: 10, carbsG: 20, fatG: 5 };
    const scaled = scaleFoodItem(item, 150);
    expect(scaled.grams).toBe(150);
    expect(scaled.kcal).toBe(300);
    expect(scaled.proteinG).toBe(15);
    expect(scaled.carbsG).toBe(30);
    expect(scaled.fatG).toBe(7.5);
  });

  it('scales down correctly', () => {
    const item = { grams: 200, kcal: 400, proteinG: 40, carbsG: 20, fatG: 10 };
    const scaled = scaleFoodItem(item, 50);
    expect(scaled.kcal).toBe(100);
    expect(scaled.proteinG).toBe(10);
  });

  it('does not divide by zero when the original grams is 0', () => {
    const item = { grams: 0, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    const scaled = scaleFoodItem(item, 100);
    expect(scaled).toEqual({
      grams: 100,
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });
});

describe('sumFoodItems', () => {
  it('sums all fields across items', () => {
    const items = [
      { grams: 100, kcal: 200, proteinG: 10, carbsG: 20, fatG: 5 },
      { grams: 50, kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 },
    ];
    expect(sumFoodItems(items)).toEqual({
      grams: 150,
      kcal: 300,
      proteinG: 15,
      carbsG: 30,
      fatG: 7,
    });
  });

  it('returns all zeros for an empty list', () => {
    expect(sumFoodItems([])).toEqual({
      grams: 0,
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });
});

describe('computeKcalFromMacros / isKcalPlausible', () => {
  it('computes kcal as 4P + 4C + 9F', () => {
    expect(computeKcalFromMacros(10, 20, 5)).toBe(10 * 4 + 20 * 4 + 5 * 9);
  });

  it('accepts an exact match', () => {
    expect(isKcalPlausible(165, 10, 20, 5)).toBe(true);
  });

  it('accepts values within the 15% tolerance', () => {
    // computed = 165, 14% over = 188.1
    expect(isKcalPlausible(188, 10, 20, 5)).toBe(true);
  });

  it('rejects values outside the 15% tolerance', () => {
    // computed = 165, 20% over = 198
    expect(isKcalPlausible(198, 10, 20, 5)).toBe(false);
  });

  it('treats zero-macro, zero-kcal items as plausible', () => {
    expect(isKcalPlausible(0, 0, 0, 0)).toBe(true);
  });

  it('rejects a nonzero kcal with all-zero macros', () => {
    expect(isKcalPlausible(100, 0, 0, 0)).toBe(false);
  });
});
