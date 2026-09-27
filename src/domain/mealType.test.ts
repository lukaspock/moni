import { suggestMealType } from './mealType';

function atHour(hour: number): Date {
  const d = new Date(2026, 5, 1, hour, 0, 0);
  return d;
}

describe('suggestMealType', () => {
  it('suggests breakfast in the morning window', () => {
    expect(suggestMealType(atHour(5))).toBe('breakfast');
    expect(suggestMealType(atHour(8))).toBe('breakfast');
    expect(suggestMealType(atHour(10))).toBe('breakfast');
  });

  it('suggests lunch in the midday window', () => {
    expect(suggestMealType(atHour(11))).toBe('lunch');
    expect(suggestMealType(atHour(13))).toBe('lunch');
    expect(suggestMealType(atHour(14))).toBe('lunch');
  });

  it('suggests snack for the afternoon gap', () => {
    expect(suggestMealType(atHour(15))).toBe('snack');
    expect(suggestMealType(atHour(16))).toBe('snack');
  });

  it('suggests dinner in the evening window', () => {
    expect(suggestMealType(atHour(17))).toBe('dinner');
    expect(suggestMealType(atHour(20))).toBe('dinner');
    expect(suggestMealType(atHour(21))).toBe('dinner');
  });

  it('suggests snack at night', () => {
    expect(suggestMealType(atHour(22))).toBe('snack');
    expect(suggestMealType(atHour(0))).toBe('snack');
    expect(suggestMealType(atHour(4))).toBe('snack');
  });
});
