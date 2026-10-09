import {
  applyRestConfirmations,
  buildLedgerDays,
  deriveStrengthFacts,
  emptyLedgerCache,
  ledgerDaysSorted,
  ledgerFetchFrom,
  localDateFromInstant,
  mergeLedger,
  parseLedgerCache,
  type LedgerFoodRow,
  type LedgerWorkoutRow,
} from './ledger';
import { day } from './ledgerFixtures';

/** Local-time instant, timezone independent for the test machine. */
const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();

const food = (over: Partial<LedgerFoodRow> = {}): LedgerFoodRow => ({
  date: '2026-01-05',
  logged_at: at(2026, 1, 5, 8),
  meal_type: 'breakfast',
  source: 'text',
  kcal: 400,
  protein_g: 20,
  ...over,
});

const workout = (over: Partial<LedgerWorkoutRow> = {}): LedgerWorkoutRow => ({
  started_at: at(2026, 1, 5, 17),
  ended_at: at(2026, 1, 5, 18),
  category: 'strength',
  kcal_burned: 300,
  ...over,
});

const none = { food: [], workouts: [], weights: [], targets: [] };

describe('localDateFromInstant', () => {
  it('uses the device-local date', () => {
    expect(localDateFromInstant(at(2026, 1, 5, 23, 30))).toBe('2026-01-05');
    expect(localDateFromInstant(at(2026, 1, 6, 0, 10))).toBe('2026-01-06');
  });
});

describe('buildLedgerDays', () => {
  it('returns nothing without data', () => {
    expect(buildLedgerDays(none)).toEqual([]);
  });

  it('aggregates food per day with meals, sources and first log hour', () => {
    const [d] = buildLedgerDays({
      ...none,
      food: [
        food({
          logged_at: at(2026, 1, 5, 9),
          meal_type: 'lunch',
          source: 'photo',
          kcal: 600,
          protein_g: 30,
        }),
        food({
          logged_at: at(2026, 1, 5, 7),
          meal_type: 'breakfast',
          source: 'barcode',
        }),
        food({ meal_type: 'snack', source: 'voice' }),
        food({ meal_type: 'dinner', source: 'label' }),
      ],
    });
    expect(d.foodLogCount).toBe(4);
    expect(d.kcalEaten).toBe(600 + 400 * 3);
    expect(d.proteinG).toBe(30 + 20 * 3);
    expect(d.meals).toEqual({ breakfast: 1, lunch: 1, dinner: 1, snack: 1 });
    expect(d.sources).toEqual({ photo: 1, voice: 1, barcode: 1, label: 1 });
    expect(d.firstLogHour).toBe(7);
  });

  it('only counts completed workouts and assigns them to the local start day', () => {
    const days = buildLedgerDays({
      ...none,
      workouts: [
        workout(),
        workout({ ended_at: null }), // still running
        workout({
          started_at: at(2026, 1, 5, 23, 30),
          ended_at: at(2026, 1, 6, 0, 30), // over midnight -> start day
          category: 'cardio',
          kcal_burned: null,
        }),
      ],
    });
    expect(days).toHaveLength(1);
    expect(days[0].date).toBe('2026-01-05');
    expect(days[0].workoutCount).toBe(2);
    expect(days[0].workoutKcal).toBe(300);
    expect(days[0].hadStrength).toBe(true);
    expect(days[0].hadCardioOrSport).toBe(true);
    expect(days[0].longestWorkoutMin).toBe(60);
  });

  it('does not mark other categories as cardio/sport', () => {
    const [d] = buildLedgerDays({
      ...none,
      workouts: [workout({ category: 'other' })],
    });
    expect(d.hadCardioOrSport).toBe(false);
    expect(d.hadStrength).toBe(false);
    expect(d.workoutCount).toBe(1);
  });

  it('sums protein within 3 h after a workout (bridge)', () => {
    const [d] = buildLedgerDays({
      ...none,
      workouts: [workout()], // ends 18:00
      food: [
        food({ logged_at: at(2026, 1, 5, 17, 30), protein_g: 50 }), // before the end
        food({ logged_at: at(2026, 1, 5, 18, 30), protein_g: 20 }),
        food({ logged_at: at(2026, 1, 5, 20, 0), protein_g: 10 }),
        food({ logged_at: at(2026, 1, 5, 21, 30), protein_g: 40 }), // > 3 h
      ],
    });
    expect(d.bridgeProteinG).toBe(30);
  });

  it('marks weigh-ins and merges targets (incl. bonus) only into days with activity', () => {
    const days = buildLedgerDays({
      food: [food()],
      workouts: [],
      weights: [{ date: '2026-01-05' }, { date: '2026-01-04' }],
      targets: [
        {
          date: '2026-01-05',
          base_kcal: 2000,
          workout_bonus_kcal: 300,
          protein_g: 150,
        },
        {
          date: '2026-01-03',
          base_kcal: 2000,
          workout_bonus_kcal: 0,
          protein_g: 150,
        },
      ],
    });
    expect(days.map((d) => d.date)).toEqual(['2026-01-04', '2026-01-05']);
    expect(days[0].weightLogged).toBe(true);
    expect(days[1].targetKcal).toBe(2300);
    expect(days[1].baseKcal).toBe(2000);
    expect(days[1].targetProteinG).toBe(150);
    expect(days[0].targetKcal).toBeNull();
  });
});

describe('ledger cache', () => {
  const a = day('2026-01-01', { foodLogCount: 2 });
  const b = day('2026-01-10', { foodLogCount: 2 });
  const c = day('2026-01-20', { foodLogCount: 2 });

  it('plans the incremental fetch start', () => {
    expect(ledgerFetchFrom(emptyLedgerCache())).toBeNull();
    expect(
      ledgerFetchFrom({ ...emptyLedgerCache(), lastSyncedDate: '2026-01-20' }),
    ).toBe('2026-01-13');
    expect(
      ledgerFetchFrom(
        { ...emptyLedgerCache(), lastSyncedDate: '2026-01-20' },
        0,
      ),
    ).toBe('2026-01-20');
  });

  it('replaces the refreshed range and keeps older days', () => {
    const cache = mergeLedger(emptyLedgerCache(), [a, b, c], {
      from: null,
      to: '2026-01-20',
    });
    expect(cache.lastSyncedDate).toBe('2026-01-20');
    const late = day('2026-01-22', { foodLogCount: 5 });
    const next = mergeLedger(cache, [late], {
      from: '2026-01-13',
      to: '2026-01-25',
    });
    // a, b untouched (outside), c dropped because the server no longer has it
    expect(next.days['2026-01-01']).toEqual(a);
    expect(next.days['2026-01-10']).toEqual(b);
    expect(next.days['2026-01-20']).toBeUndefined();
    expect(next.days['2026-01-22']).toEqual(late);
    expect(next.lastSyncedDate).toBe('2026-01-25');
  });

  it('applies server updates and deletions inside the window', () => {
    const cache = mergeLedger(emptyLedgerCache(), [a, b, c], {
      from: null,
      to: '2026-01-20',
    });
    const next = mergeLedger(cache, [{ ...c, foodLogCount: 9 }], {
      from: '2026-01-10',
      to: '2026-01-20',
    });
    expect(next.days['2026-01-10']).toBeUndefined(); // deleted on the server
    expect(next.days['2026-01-20'].foodLogCount).toBe(9);
    expect(next.days['2026-01-01']).toEqual(a);
  });

  it('does not move lastSyncedDate backwards and does not mutate', () => {
    const cache = mergeLedger(emptyLedgerCache(), [a], {
      from: null,
      to: '2026-01-20',
    });
    const snapshot = JSON.stringify(cache);
    const next = mergeLedger(cache, [], {
      from: '2026-01-01',
      to: '2026-01-05',
    });
    expect(next.lastSyncedDate).toBe('2026-01-20');
    expect(JSON.stringify(cache)).toBe(snapshot);
  });

  it('a full rebuild replaces everything', () => {
    const cache = mergeLedger(emptyLedgerCache(), [a, b], {
      from: null,
      to: '2026-01-10',
    });
    const next = mergeLedger(cache, [c], { from: null, to: '2026-01-20' });
    expect(Object.keys(next.days)).toEqual(['2026-01-20']);
  });

  it('lists days sorted', () => {
    const cache = mergeLedger(emptyLedgerCache(), [c, a, b], {
      from: null,
      to: '2026-01-20',
    });
    expect(ledgerDaysSorted(cache).map((d) => d.date)).toEqual([
      '2026-01-01',
      '2026-01-10',
      '2026-01-20',
    ]);
  });

  it('round-trips through JSON and fills fields added later', () => {
    const cache = mergeLedger(emptyLedgerCache(), [a], {
      from: null,
      to: '2026-01-01',
    });
    expect(parseLedgerCache(JSON.stringify(cache))).toEqual(cache);
    const legacy = JSON.stringify({
      version: 1,
      lastSyncedDate: '2026-01-01',
      days: { '2026-01-01': { date: '2026-01-01', foodLogCount: 3 } },
    });
    const parsed = parseLedgerCache(legacy);
    expect(parsed?.days['2026-01-01'].foodLogCount).toBe(3);
    expect(parsed?.days['2026-01-01'].meals).toEqual({
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
    });
  });

  it.each([
    null,
    undefined,
    '',
    'not json',
    '{}',
    '{"version":2,"days":{}}',
    '{"version":1,"days":null}',
    '{"version":1,"lastSyncedDate":5,"days":{}}',
  ])('rejects unusable cache %p', (raw) => {
    expect(parseLedgerCache(raw as string | null | undefined)).toBeNull();
  });
});

describe('applyRestConfirmations', () => {
  it('flags existing days and adds missing ones', () => {
    const base = [day('2026-01-05', { foodLogCount: 1 })];
    const out = applyRestConfirmations(
      base,
      new Set(['2026-01-05', '2026-01-03']),
    );
    expect(out.map((d) => d.date)).toEqual(['2026-01-03', '2026-01-05']);
    expect(out.every((d) => d.restConfirmed)).toBe(true);
    expect(base[0].restConfirmed).toBe(false);
  });
});

describe('deriveStrengthFacts', () => {
  const row = (
    ex: string | null,
    week: string | null,
    rm: number | null,
    vol: number | null,
  ) => ({
    exercise_id: ex,
    week_start: week,
    estimated_1rm_kg: rm,
    volume_kg: vol,
  });

  it('sums volume and finds the first personal record', () => {
    const f = deriveStrengthFacts(
      [
        row('a', '2026-01-05', 100, 3000),
        row('a', '2026-01-12', 100, 3500), // equal -> no PR
        row('a', '2026-01-19', 105, 4000),
        row('b', '2026-01-05', 50, 1000),
        row('b', '2026-01-12', 55, 1000),
      ],
      null,
    );
    expect(f.totalVolumeKg).toBe(12500);
    expect(f.firstPrDate).toBe('2026-01-12');
  });

  it('has no PR from a single week', () => {
    expect(
      deriveStrengthFacts([row('a', '2026-01-05', 100, 10)], null).firstPrDate,
    ).toBeNull();
  });

  it('measures the 1RM gain only over >= 4 weeks of history', () => {
    const short = deriveStrengthFacts(
      [row('a', '2026-01-05', 100, 1), row('a', '2026-01-12', 120, 1)],
      null,
    );
    expect(short.bestOneRmGainPct).toBeNull();
    const long = deriveStrengthFacts(
      [row('a', '2026-01-05', 100, 1), row('a', '2026-02-02', 112, 1)],
      null,
    );
    expect(long.bestOneRmGainPct).toBeCloseTo(12);
  });

  it('detects a bodyweight lift, optionally restricted to eligible exercises', () => {
    const rows = [
      row('squat', '2026-01-05', 85, 1),
      row('curl', '2026-01-05', 20, 1),
    ];
    expect(deriveStrengthFacts(rows, 80).bodyweightLiftDone).toBe(true);
    expect(deriveStrengthFacts(rows, 90).bodyweightLiftDone).toBe(false);
    expect(deriveStrengthFacts(rows, null).bodyweightLiftDone).toBe(false);
    expect(
      deriveStrengthFacts(rows, 80, new Set(['curl'])).bodyweightLiftDone,
    ).toBe(false);
  });

  it('tolerates null columns', () => {
    const f = deriveStrengthFacts(
      [row(null, null, null, null), row('a', null, 5, null)],
      70,
    );
    expect(f.totalVolumeKg).toBe(0);
    expect(f.firstPrDate).toBeNull();
  });
});
