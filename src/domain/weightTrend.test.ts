import {
  compareTrainingDays,
  currentStreak,
  dailyAverages,
  filterByRange,
  kcalAdherence,
  pearson,
  smoothTrend,
  weeklyRateKg,
  workoutDaysPerWeek,
  weightVsKcalCorrelation,
  type DaySummary,
} from './weightTrend';
import { shiftIsoDate } from './adaptive';

const day = (date: string, o: Partial<DaySummary> = {}): DaySummary => ({
  date,
  kcalEaten: 2000,
  targetKcal: 2000,
  proteinEatenG: 120,
  targetProteinG: 130,
  logged: true,
  hadWorkout: false,
  ...o,
});

describe('weight trend', () => {
  it('averages multiple entries per day', () => {
    const r = dailyAverages([
      { date: '2026-01-02', weightKg: 80 },
      { date: '2026-01-01', weightKg: 70 },
      { date: '2026-01-01', weightKg: 72 },
    ]);
    expect(r).toEqual([
      { date: '2026-01-01', weightKg: 71 },
      { date: '2026-01-02', weightKg: 80 },
    ]);
  });

  it('smooths: starts at first value, lags a jump', () => {
    const s = smoothTrend([
      { date: '2026-01-01', weightKg: 80 },
      { date: '2026-01-02', weightKg: 82 },
    ]);
    expect(s[0].weightKg).toBe(80);
    expect(s[1].weightKg).toBeGreaterThan(80);
    expect(s[1].weightKg).toBeLessThan(81);
  });

  it('filters by range', () => {
    const pts = [
      { date: '2026-01-01' },
      { date: '2026-03-01' },
      { date: '2026-03-20' },
    ];
    expect(filterByRange(pts, '4w', '2026-03-20').map((p) => p.date)).toEqual([
      '2026-03-01',
      '2026-03-20',
    ]);
    expect(filterByRange(pts, 'all', '2026-03-20')).toHaveLength(3);
    expect(filterByRange(pts, '12w', '2026-03-20')).toHaveLength(3);
  });

  it('shifts dates across months', () => {
    expect(shiftIsoDate('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('computes weekly rate from a linear loss', () => {
    const pts = Array.from({ length: 15 }, (_, i) => ({
      date: shiftIsoDate('2026-01-01', i),
      weightKg: 80 - i * 0.1,
    }));
    expect(weeklyRateKg(pts)).toBeCloseTo(-0.7, 5);
  });

  it('returns null rate for too little data', () => {
    expect(weeklyRateKg([{ date: '2026-01-01', weightKg: 80 }])).toBeNull();
    expect(
      weeklyRateKg([
        { date: '2026-01-01', weightKg: 80 },
        { date: '2026-01-03', weightKg: 79 },
      ]),
    ).toBeNull();
  });
});

describe('correlation helpers', () => {
  it('pearson of perfectly correlated data', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 10);
    expect(pearson([1, 2], [1, 2])).toBeNull();
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
  });

  it('kcal adherence ignores unlogged days and days without target', () => {
    const a = kcalAdherence([
      day('2026-01-01', { kcalEaten: 2100 }),
      day('2026-01-02', { kcalEaten: 1000 }),
      day('2026-01-03', { logged: false, kcalEaten: 0 }),
      day('2026-01-04', { targetKcal: null }),
    ]);
    expect(a?.loggedDays).toBe(2);
    expect(a?.daysOnTarget).toBe(1);
    expect(a?.avgDeltaKcal).toBeCloseTo(-450);
    expect(kcalAdherence([])).toBeNull();
  });

  it('compares training vs rest days only with enough data', () => {
    const days = [
      ...[1, 2, 3].map((d) =>
        day(`2026-01-0${d}`, { hadWorkout: true, proteinEatenG: 150 }),
      ),
      ...[4, 5, 6].map((d) => day(`2026-01-0${d}`, { proteinEatenG: 100 })),
    ];
    const c = compareTrainingDays(days);
    expect(c?.avgProteinTrainingG).toBe(150);
    expect(c?.avgProteinRestG).toBe(100);
    expect(compareTrainingDays(days.slice(0, 4))).toBeNull();
  });

  it('streak counts back from today or yesterday', () => {
    expect(
      currentStreak(
        new Set(['2026-01-05', '2026-01-04', '2026-01-02']),
        '2026-01-05',
      ),
    ).toBe(2);
    expect(
      currentStreak(new Set(['2026-01-04', '2026-01-03']), '2026-01-05'),
    ).toBe(2);
    expect(currentStreak(new Set(['2026-01-01']), '2026-01-05')).toBe(0);
  });

  it('buckets workouts per week, oldest first', () => {
    const days = [
      day('2026-01-14', { hadWorkout: true }),
      day('2026-01-13', { hadWorkout: true }),
      day('2026-01-01', { hadWorkout: true }),
    ];
    expect(workoutDaysPerWeek(days, '2026-01-14', 2)).toEqual([1, 2]);
  });

  it('weight vs kcal correlation needs enough weeks', () => {
    expect(weightVsKcalCorrelation([], [], '2026-03-01')).toBeNull();
    const days: DaySummary[] = [];
    const trend: { date: string; weightKg: number }[] = [];
    const today = '2026-03-01';
    for (let w = 0; w < 6; w++) {
      for (let i = 0; i < 7; i++) {
        days.push(
          day(shiftIsoDate(today, -(w * 7 + i)), { kcalEaten: 1800 + w * 100 }),
        );
      }
    }
    // older weeks (higher w) eat more and gain more
    let kg = 80;
    for (let n = 45; n >= 0; n--) {
      const w = Math.floor(n / 7);
      kg += (0.05 * w) / 7;
      trend.push({ date: shiftIsoDate(today, -n), weightKg: kg });
    }
    const r = weightVsKcalCorrelation(days, trend, today, 6, 4);
    expect(r).not.toBeNull();
    expect(r!.r).toBeGreaterThan(0.9);
  });
});
