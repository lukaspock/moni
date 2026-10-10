import {
  calculateWaterGoalMl,
  isValidWaterAmount,
  sumWaterMl,
  waterDisplay,
  waterProgress,
  WATER_PRESETS_ML,
} from './water';
import { flOzToMl, mlToFlOz } from './units';

describe('calculateWaterGoalMl', () => {
  it('uses 35 ml per kg, rounded to 250 ml', () => {
    // 70 × 35 = 2450 → 2500
    expect(calculateWaterGoalMl({ weightKg: 70, isTrainingDay: false })).toBe(
      2500,
    );
    // 80 × 35 = 2800 → 2750
    expect(calculateWaterGoalMl({ weightKg: 80, isTrainingDay: false })).toBe(
      2750,
    );
  });

  it('adds 500 ml on a training day', () => {
    // 80 × 35 + 500 = 3300 → 3250
    expect(calculateWaterGoalMl({ weightKg: 80, isTrainingDay: true })).toBe(
      3250,
    );
  });

  it('clamps to 1500–4000 ml', () => {
    expect(calculateWaterGoalMl({ weightKg: 30, isTrainingDay: false })).toBe(
      1500,
    );
    expect(calculateWaterGoalMl({ weightKg: 140, isTrainingDay: true })).toBe(
      4000,
    );
  });

  it('falls back to 2500 ml without a weight', () => {
    expect(calculateWaterGoalMl({ weightKg: null, isTrainingDay: false })).toBe(
      2500,
    );
    expect(calculateWaterGoalMl({ weightKg: 0, isTrainingDay: true })).toBe(
      3000,
    );
    expect(
      calculateWaterGoalMl({ weightKg: Number.NaN, isTrainingDay: false }),
    ).toBe(2500);
  });
});

describe('waterProgress', () => {
  it('computes remaining, fraction and glasses', () => {
    const p = waterProgress(1000, 2500);
    expect(p.remainingMl).toBe(1500);
    expect(p.fraction).toBeCloseTo(0.4);
    expect(p.reached).toBe(false);
    expect(p.glassesLeft).toBe(6);
  });

  it('caps the fraction and marks the goal reached', () => {
    const p = waterProgress(3000, 2500);
    expect(p.fraction).toBe(1);
    expect(p.remainingMl).toBe(0);
    expect(p.reached).toBe(true);
    expect(p.glassesLeft).toBe(0);
  });

  it('rounds glasses up and handles a zero goal', () => {
    expect(waterProgress(2400, 2500).glassesLeft).toBe(1);
    const zero = waterProgress(500, 0);
    expect(zero.fraction).toBe(0);
    expect(zero.reached).toBe(false);
  });
});

describe('sumWaterMl / isValidWaterAmount', () => {
  it('sums positive amounts only', () => {
    expect(
      sumWaterMl([{ ml: 250 }, { ml: 330 }, { ml: -5 }, { ml: NaN }]),
    ).toBe(580);
    expect(sumWaterMl([])).toBe(0);
  });

  it('validates like the DB check constraint', () => {
    expect(WATER_PRESETS_ML.every(isValidWaterAmount)).toBe(true);
    expect(isValidWaterAmount(0)).toBe(false);
    expect(isValidWaterAmount(5000)).toBe(true);
    expect(isValidWaterAmount(5001)).toBe(false);
    expect(isValidWaterAmount(250.5)).toBe(false);
  });
});

describe('waterDisplay', () => {
  it('shows ml below a litre and litres above', () => {
    expect(waterDisplay(330, 'metric')).toEqual({ value: 330, unit: 'ml' });
    expect(waterDisplay(2500, 'metric')).toEqual({ value: 2.5, unit: 'l' });
    expect(waterDisplay(1250, 'metric')).toEqual({ value: 1.25, unit: 'l' });
  });

  it('shows whole fl oz for imperial', () => {
    expect(waterDisplay(250, 'imperial')).toEqual({ value: 8, unit: 'flOz' });
    expect(waterDisplay(500, 'imperial')).toEqual({ value: 17, unit: 'flOz' });
  });

  it('fl oz conversion round-trips', () => {
    expect(mlToFlOz(flOzToMl(12))).toBeCloseTo(12);
    expect(flOzToMl(1)).toBeCloseTo(29.5735);
  });
});
