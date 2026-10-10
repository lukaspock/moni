import { day } from '../../domain/ledgerFixtures';
import {
  bodyFactsFromWeights,
  clampGoals,
  hasTrainingPattern,
  ledgerToDaySummaries,
  makeGoalsForWeek,
  trainingComparisonUntil,
  trendDeltaInRange,
  weeklyPrs,
} from './derive';

describe('makeGoalsForWeek', () => {
  it('derives goals from the profile', () => {
    const g = makeGoalsForWeek({
      workoutsPerWeek: 4,
      experience: 'intermediate',
      accountCreatedAt: '2026-01-01',
    });
    expect(g('2026-03-02')).toEqual({
      foodDays: 5,
      trainingDays: 4,
      proteinDays: 4,
    });
  });

  it('caps beginners during their first 4 weeks, relative to account creation', () => {
    const g = makeGoalsForWeek({
      workoutsPerWeek: 5,
      experience: 'beginner',
      accountCreatedAt: '2026-01-05T10:00:00Z',
    });
    expect(g('2026-01-05').trainingDays).toBe(3);
    expect(g('2026-01-26').trainingDays).toBe(3); // week 3
    expect(g('2026-02-02').trainingDays).toBe(5); // week 4
  });

  it('treats a missing creation date as long ago', () => {
    const g = makeGoalsForWeek({
      workoutsPerWeek: 5,
      experience: 'beginner',
      accountCreatedAt: null,
    });
    expect(g('2026-01-05').trainingDays).toBe(5);
    const bad = makeGoalsForWeek({
      workoutsPerWeek: 5,
      experience: 'beginner',
      accountCreatedAt: 'garbage',
    });
    expect(bad('2026-01-05').trainingDays).toBe(5);
  });

  it('applies and clamps local overrides, and keeps the ring off for 0 workouts', () => {
    const g = makeGoalsForWeek({
      workoutsPerWeek: 3,
      experience: null,
      accountCreatedAt: null,
      overrides: { trainingDays: 9, foodDays: 0 },
    });
    expect(g('2026-01-05')).toEqual({
      foodDays: 1,
      trainingDays: 7,
      proteinDays: 4,
    });
    const off = makeGoalsForWeek({
      workoutsPerWeek: 0,
      experience: null,
      accountCreatedAt: null,
    });
    expect(off('2026-01-05').trainingDays).toBe(0);
    expect(
      clampGoals({ foodDays: 5, trainingDays: 0, proteinDays: 4 }).trainingDays,
    ).toBe(0);
  });
});

describe('bodyFactsFromWeights', () => {
  it('is empty without weigh-ins', () => {
    expect(bodyFactsFromWeights([])).toEqual({
      startWeightKg: null,
      trendWeightKg: null,
    });
  });
  it('uses the first day as start and the smoothed value as trend', () => {
    const f = bodyFactsFromWeights([
      { date: '2026-01-01', weightKg: 80 },
      { date: '2026-01-01', weightKg: 82 }, // two entries -> mean 81
      { date: '2026-01-08', weightKg: 78 },
    ]);
    expect(f.startWeightKg).toBe(81);
    expect(f.trendWeightKg).toBeGreaterThan(78);
    expect(f.trendWeightKg).toBeLessThan(81);
  });
});

describe('trendDeltaInRange', () => {
  const points = [
    { date: '2026-01-01', weightKg: 80 },
    { date: '2026-01-08', weightKg: 79 },
    { date: '2026-01-10', weightKg: 78.5 },
    { date: '2026-01-12', weightKg: 78 },
    { date: '2026-01-14', weightKg: 77.8 },
  ];
  it('returns entries and the (negative) trend change', () => {
    const r = trendDeltaInRange(points, '2026-01-09', '2026-01-15');
    expect(r?.entries).toBe(3);
    expect(r?.trendDeltaKg).toBeLessThan(0);
  });
  it('returns null without entries in the range', () => {
    expect(trendDeltaInRange(points, '2026-02-01', '2026-02-07')).toBeNull();
    expect(trendDeltaInRange([], '2026-01-01', '2026-01-07')).toBeNull();
  });
});

describe('pattern helpers', () => {
  const logged = (date: string, workout: boolean) =>
    day(date, {
      foodLogCount: 2,
      kcalEaten: 2000,
      proteinG: 100,
      workoutCount: workout ? 1 : 0,
    });
  const mk = (n: number, start: string, workout: boolean) =>
    Array.from({ length: n }, (_, i) =>
      logged(`2026-01-${String(Number(start) + i).padStart(2, '0')}`, workout),
    );

  it('maps ledger days to summaries', () => {
    const [s] = ledgerToDaySummaries([logged('2026-01-05', true)]);
    expect(s).toMatchObject({
      logged: true,
      hadWorkout: true,
      proteinEatenG: 100,
    });
  });
  it('finds a pattern once both groups have >= 3 logged days', () => {
    expect(
      hasTrainingPattern([...mk(3, '01', true), ...mk(3, '10', false)]),
    ).toBe(true);
    expect(
      hasTrainingPattern([...mk(3, '01', true), ...mk(2, '10', false)]),
    ).toBe(false);
  });
  it('limits the comparison window to 28 days', () => {
    const days = [...mk(3, '01', true), ...mk(3, '10', false)];
    expect(trainingComparisonUntil(days, '2026-01-28')).not.toBeNull();
    expect(trainingComparisonUntil(days, '2026-03-15')).toBeNull();
  });
});

describe('weeklyPrs', () => {
  const row = (ex: string, week: string, rm: number) => ({
    exercise_id: ex,
    week_start: week,
    estimated_1rm_kg: rm,
    volume_kg: 0,
  });
  it('returns exercises that beat every earlier week', () => {
    const rows = [
      row('a', '2026-01-05', 100),
      row('a', '2026-01-12', 104.4),
      row('b', '2026-01-05', 50),
      row('b', '2026-01-12', 50),
      row('c', '2026-01-12', 30),
    ];
    expect(weeklyPrs(rows, '2026-01-12')).toEqual([
      { exerciseId: 'a', gainKg: 4.4 },
    ]);
  });
  it('needs history and ignores incomplete rows', () => {
    expect(weeklyPrs([row('a', '2026-01-12', 100)], '2026-01-12')).toEqual([]);
    expect(
      weeklyPrs(
        [
          {
            exercise_id: null,
            week_start: '2026-01-12',
            estimated_1rm_kg: 5,
            volume_kg: 0,
          },
        ],
        '2026-01-12',
      ),
    ).toEqual([]);
  });
});
