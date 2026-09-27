import {
  checkAdaptivePrerequisites,
  calculateWeightEMA,
  calculateObservedTDEE,
  calculateBlendWeight,
  calculateDataScore,
  blendTDEE,
  clampWeeklyChange,
  computeAdaptiveTDEE,
  MAX_BLEND_WEIGHT,
  MAX_WEEKLY_CHANGE_KCAL,
} from './adaptive';

describe('checkAdaptivePrerequisites', () => {
  it('passes when all thresholds are met', () => {
    expect(checkAdaptivePrerequisites({ daysOfData: 14, weightEntryCount: 8, foodLogCoverage: 0.8 })).toBe(true);
  });

  it('fails when there are too few days', () => {
    expect(checkAdaptivePrerequisites({ daysOfData: 13, weightEntryCount: 20, foodLogCoverage: 1 })).toBe(false);
  });

  it('fails when there are too few weight entries', () => {
    expect(checkAdaptivePrerequisites({ daysOfData: 30, weightEntryCount: 7, foodLogCoverage: 1 })).toBe(false);
  });

  it('fails when food-log coverage is too low', () => {
    expect(checkAdaptivePrerequisites({ daysOfData: 30, weightEntryCount: 20, foodLogCoverage: 0.79 })).toBe(false);
  });
});

describe('calculateWeightEMA', () => {
  it('returns an empty array for no data', () => {
    expect(calculateWeightEMA([])).toEqual([]);
  });

  it('starts at the first value and smooths subsequent ones with alpha', () => {
    const ema = calculateWeightEMA([80, 81, 79], 0.1);
    expect(ema[0]).toBe(80);
    expect(ema[1]).toBeCloseTo(0.1 * 81 + 0.9 * 80, 5); // 80.1
    expect(ema[2]).toBeCloseTo(0.1 * 79 + 0.9 * ema[1], 5);
  });

  it('stays constant for a flat series', () => {
    const ema = calculateWeightEMA([70, 70, 70, 70]);
    expect(ema.every((v) => v === 70)).toBe(true);
  });
});

describe('calculateObservedTDEE', () => {
  it('matches the documented formula', () => {
    // avg intake 2200, trend weight dropped 0.7kg over 14 days
    // observed = 2200 - (-0.7 * 7700)/14 = 2200 + 385 = 2585
    expect(calculateObservedTDEE(2200, -0.7, 14)).toBeCloseTo(2585, 5);
  });

  it('falls back to avg intake when days is 0', () => {
    expect(calculateObservedTDEE(2200, -0.7, 0)).toBe(2200);
  });
});

describe('calculateDataScore / calculateBlendWeight', () => {
  it('caps the blend weight at MAX_BLEND_WEIGHT with saturated data', () => {
    const input = { daysOfData: 999, weightEntryCount: 999, foodLogCoverage: 1 };
    expect(calculateDataScore(input)).toBeCloseTo(1, 5);
    expect(calculateBlendWeight(input)).toBeCloseTo(MAX_BLEND_WEIGHT, 5);
  });

  it('produces a lower weight with minimal (but sufficient) data', () => {
    const input = { daysOfData: 14, weightEntryCount: 8, foodLogCoverage: 0.8 };
    const w = calculateBlendWeight(input);
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThan(MAX_BLEND_WEIGHT);
  });
});

describe('blendTDEE', () => {
  it('returns the formula value when w=0', () => {
    expect(blendTDEE(3000, 2500, 0)).toBe(2500);
  });

  it('returns the observed value when w=1', () => {
    expect(blendTDEE(3000, 2500, 1)).toBe(3000);
  });

  it('blends proportionally in between', () => {
    expect(blendTDEE(3000, 2500, 0.5)).toBe(2750);
  });
});

describe('clampWeeklyChange', () => {
  it('passes through small changes unclamped', () => {
    expect(clampWeeklyChange(2600, 2550)).toBe(2600);
  });

  it('clamps a large increase to +150', () => {
    expect(clampWeeklyChange(3000, 2500)).toBe(2500 + MAX_WEEKLY_CHANGE_KCAL);
  });

  it('clamps a large decrease to -150', () => {
    expect(clampWeeklyChange(2000, 2500)).toBe(2500 - MAX_WEEKLY_CHANGE_KCAL);
  });
});

describe('computeAdaptiveTDEE', () => {
  it('falls back to the formula TDEE with reason insufficient_data when prerequisites fail', () => {
    const result = computeAdaptiveTDEE({
      formulaTDEE: 2400,
      previousBlendedTDEE: 2400,
      avgIntakeKcal: 2600,
      trendWeightDeltaKg: -0.2,
      days: 10,
      prerequisites: { daysOfData: 10, weightEntryCount: 3, foodLogCoverage: 0.5 },
    });
    expect(result.reasonCode).toBe('insufficient_data');
    expect(result.observedTDEE).toBeNull();
    expect(result.blendedTDEE).toBe(2400);
    expect(result.confidence).toBe(0);
  });

  it('reports observed_higher_than_formula and blends toward it when data is sufficient', () => {
    const result = computeAdaptiveTDEE({
      formulaTDEE: 2400,
      previousBlendedTDEE: 2400,
      avgIntakeKcal: 2500,
      trendWeightDeltaKg: -0.1, // small loss despite higher intake -> observed TDEE above formula
      days: 30,
      prerequisites: { daysOfData: 30, weightEntryCount: 15, foodLogCoverage: 0.9 },
    });
    expect(result.observedTDEE).not.toBeNull();
    expect(result.observedTDEE as number).toBeGreaterThan(2400);
    expect(result.reasonCode).toBe('observed_higher_than_formula');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('clamps a large weekly jump and reports clamped_by_weekly_limit', () => {
    const result = computeAdaptiveTDEE({
      formulaTDEE: 2400,
      previousBlendedTDEE: 2400,
      avgIntakeKcal: 4000,
      trendWeightDeltaKg: -2, // extreme observed TDEE swing
      days: 14,
      prerequisites: { daysOfData: 90, weightEntryCount: 60, foodLogCoverage: 1 },
    });
    expect(result.reasonCode).toBe('clamped_by_weekly_limit');
    expect(Math.abs(result.weeklyChangeKcal)).toBeLessThanOrEqual(MAX_WEEKLY_CHANGE_KCAL);
  });
});
