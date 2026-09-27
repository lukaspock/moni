import {
  calculateSessionDensity,
  estimateStrengthMET,
  calculateKcalBurned,
  estimateOneRepMaxEpley,
  estimateOneRepMaxBrzycki,
  calculateSetVolume,
  estimatePlannedStrengthKcal,
  metForIntensity,
  STRENGTH_MET_MIN,
  STRENGTH_MET_MAX,
} from './met';

describe('calculateSessionDensity', () => {
  it('computes sets per minute', () => {
    expect(calculateSessionDensity(20, 60)).toBeCloseTo(0.333, 3);
  });

  it('returns 0 for a zero-duration session', () => {
    expect(calculateSessionDensity(10, 0)).toBe(0);
  });
});

describe('estimateStrengthMET', () => {
  it('clamps to the minimum MET below the low-density bound', () => {
    expect(estimateStrengthMET(0.05)).toBe(STRENGTH_MET_MIN);
  });

  it('clamps to the maximum MET above the high-density bound', () => {
    expect(estimateStrengthMET(1.0)).toBe(STRENGTH_MET_MAX);
  });

  it('interpolates linearly at the midpoint density', () => {
    // midpoint of [0.15, 0.6] = 0.375 -> midpoint MET of [3.5, 6.0] = 4.75
    expect(estimateStrengthMET(0.375)).toBeCloseTo(4.75, 5);
  });
});

describe('calculateKcalBurned', () => {
  it('matches kcal = MET * kg * hours', () => {
    expect(calculateKcalBurned(5, 80, 1)).toBe(400);
    expect(calculateKcalBurned(8, 70, 0.5)).toBe(280);
  });
});

describe('1RM estimation', () => {
  it('Epley returns the weight itself for a single rep', () => {
    expect(estimateOneRepMaxEpley(100, 1)).toBe(100);
  });

  it('Epley matches the standard formula for multiple reps', () => {
    // 100 * (1 + 5/30) = 116.67
    expect(estimateOneRepMaxEpley(100, 5)).toBeCloseTo(116.67, 1);
  });

  it('Brzycki returns the weight itself for a single rep', () => {
    expect(estimateOneRepMaxBrzycki(100, 1)).toBe(100);
  });

  it('Brzycki matches the standard formula for multiple reps', () => {
    // 100 * 36 / (37-5) = 112.5
    expect(estimateOneRepMaxBrzycki(100, 5)).toBeCloseTo(112.5, 5);
  });
});

describe('calculateSetVolume', () => {
  it('sums reps * weight across sets', () => {
    const volume = calculateSetVolume([
      { reps: 10, weightKg: 50 },
      { reps: 8, weightKg: 55 },
      { reps: 6, weightKg: 60 },
    ]);
    expect(volume).toBe(10 * 50 + 8 * 55 + 6 * 60);
  });

  it('returns 0 for an empty set list', () => {
    expect(calculateSetVolume([])).toBe(0);
  });
});

describe('estimatePlannedStrengthKcal', () => {
  it('matches manual density -> MET -> kcal chain for a 45min default session', () => {
    const totalSets = 20;
    const weightKg = 80;
    const density = calculateSessionDensity(totalSets, 45);
    const met = estimateStrengthMET(density);
    const expected = calculateKcalBurned(met, weightKg, 45 / 60);
    expect(estimatePlannedStrengthKcal(totalSets, weightKg)).toBeCloseTo(expected, 6);
  });

  it('a denser (more sets in the same time) session burns more', () => {
    const light = estimatePlannedStrengthKcal(10, 80, 45);
    const dense = estimatePlannedStrengthKcal(30, 80, 45);
    expect(dense).toBeGreaterThan(light);
  });

  it('respects a custom duration', () => {
    const kcal = estimatePlannedStrengthKcal(20, 80, 60);
    const density = calculateSessionDensity(20, 60);
    const met = estimateStrengthMET(density);
    expect(kcal).toBeCloseTo(calculateKcalBurned(met, 80, 1), 6);
  });
});

describe('metForIntensity', () => {
  it('increases from light to vigorous', () => {
    expect(metForIntensity('light')).toBeLessThan(metForIntensity('moderate'));
    expect(metForIntensity('moderate')).toBeLessThan(metForIntensity('vigorous'));
  });
});
