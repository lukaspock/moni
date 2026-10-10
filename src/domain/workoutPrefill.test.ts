import { lbToKg } from './units';
import {
  effectiveSetValues,
  EMPTY_PREFILL,
  holdRepeatInterval,
  holdStepMultiplier,
  initialFocusIndex,
  nextFocusIndex,
  pickLastSessionSets,
  prefillForSet,
  progressionHint,
  stepStoredValue,
  topSet,
  type LastSetRow,
  type PrefillValues,
} from './workoutPrefill';

const s = (weightKg: number | null, reps: number | null): PrefillValues => ({
  ...EMPTY_PREFILL,
  weightKg,
  reps,
});

describe('prefillForSet', () => {
  const last = [s(80, 8), s(80, 7), s(77.5, 8)];

  it('uses the same set of the last session', () => {
    expect(prefillForSet(1, last, 10)).toEqual({
      values: s(80, 7),
      source: 'last',
    });
  });

  it('uses the last set for extra sets beyond the last session', () => {
    expect(prefillForSet(5, last, 10).values).toEqual(s(77.5, 8));
  });

  it('falls back to the routine target reps, then to nothing', () => {
    expect(prefillForSet(0, [], 10)).toEqual({
      values: s(null, 10),
      source: 'target',
    });
    expect(prefillForSet(0, null, null)).toEqual({
      values: EMPTY_PREFILL,
      source: 'none',
    });
    expect(prefillForSet(0, undefined, 0).source).toBe('none');
  });

  it('reads the target as minutes for time-based exercises', () => {
    expect(prefillForSet(0, [], 10, 'minutes').values).toEqual({
      ...EMPTY_PREFILL,
      durationS: 600,
    });
  });

  it('returns a copy, not the source object', () => {
    const res = prefillForSet(0, last, null);
    res.values.weightKg = 1;
    expect(last[0]!.weightKg).toBe(80);
  });
});

describe('effectiveSetValues', () => {
  it('prefers the set value per field', () => {
    expect(effectiveSetValues({ weightKg: 85, reps: null }, s(80, 8))).toEqual(
      s(85, 8),
    );
  });
});

describe('progressionHint', () => {
  it('suggests +2.5 kg when all sets hit the upper target', () => {
    expect(
      progressionHint([s(80, 10), s(80, 10), s(80, 11)], 10, 'metric'),
    ).toEqual({ suggestedWeightKg: 82.5, stepDisplay: 2.5, stepUnit: 'kg' });
  });

  it('uses the heaviest weight as base', () => {
    expect(
      progressionHint([s(80, 10), s(82.5, 10)], 10, 'metric')
        ?.suggestedWeightKg,
    ).toBe(85);
  });

  it('suggests +5 lb (stored metric) for imperial users', () => {
    const hint = progressionHint([s(lbToKg(135), 8)], 8, 'imperial');
    expect(hint?.stepUnit).toBe('lb');
    expect(hint?.stepDisplay).toBe(5);
    expect(hint!.suggestedWeightKg).toBeCloseTo(lbToKg(140), 2);
  });

  it('gives no hint when a set missed the target or data is missing', () => {
    expect(progressionHint([s(80, 10), s(80, 9)], 10, 'metric')).toBeNull();
    expect(progressionHint([s(80, 10)], null, 'metric')).toBeNull();
    expect(progressionHint([], 10, 'metric')).toBeNull();
    expect(progressionHint([s(null, 12)], 10, 'metric')).toBeNull();
  });
});

describe('stepStoredValue', () => {
  it('steps kg by 2.5 and reps by 1', () => {
    expect(stepStoredValue(80, 1, 'kg')).toBe(82.5);
    expect(stepStoredValue(80, -1, 'kg')).toBe(77.5);
    expect(stepStoredValue(8, 1, 'reps')).toBe(9);
    expect(stepStoredValue(null, 1, 'reps')).toBe(1);
  });

  it('snaps off-grid values onto the grid first', () => {
    expect(stepStoredValue(81, 1, 'kg')).toBe(82.5);
    expect(stepStoredValue(81, -1, 'kg')).toBe(80);
  });

  it('never goes below 0', () => {
    expect(stepStoredValue(1, -1, 'kg')).toBe(0);
    expect(stepStoredValue(0, -1, 'reps')).toBe(0);
    expect(stepStoredValue(null, -1, 'kg')).toBe(0);
  });

  it('steps in the display unit and stores metric', () => {
    expect(stepStoredValue(lbToKg(135), 1, 'lb')).toBeCloseTo(lbToKg(140), 2);
    expect(stepStoredValue(600, 1, 'min')).toBe(660);
    expect(stepStoredValue(5000, 1, 'km')).toBe(5100);
    expect(stepStoredValue(30, 1, 'sec')).toBe(35);
  });

  it('applies a hold multiplier', () => {
    expect(stepStoredValue(80, 1, 'kg', 2)).toBe(85);
    expect(holdStepMultiplier(0)).toBe(1);
    expect(holdStepMultiplier(8)).toBe(2);
    expect(holdStepMultiplier(25)).toBe(4);
    expect(holdRepeatInterval(0)).toBe(180);
    expect(holdRepeatInterval(100)).toBe(60);
  });
});

describe('pickLastSessionSets', () => {
  const row = (
    id: string,
    workoutId: string,
    setIndex: number,
    completedAt: string | null,
    weightKg = 80,
    exerciseId = 'bench',
  ): LastSetRow => ({
    id,
    workoutId,
    exerciseId,
    setIndex,
    completedAt,
    reps: 8,
    weightKg,
    durationS: null,
    distanceM: null,
  });
  const rows = [
    row('a1', 'w1', 0, '2026-10-01T10:00:00Z', 70),
    row('b2', 'w2', 1, '2026-10-05T10:05:00Z', 77.5),
    row('b1', 'w2', 0, '2026-10-05T10:00:00Z', 75),
    row('c1', 'w3', 0, '2026-10-06T10:00:00Z', 99, 'squat'),
  ];

  it('returns the sets of the most recent session, by set index', () => {
    expect(pickLastSessionSets(rows, 'bench').map((x) => x.weightKg)).toEqual([
      75, 77.5,
    ]);
  });

  it('skips the running session and deleted rows', () => {
    expect(
      pickLastSessionSets(rows, 'bench', { excludeWorkoutId: 'w2' }).map(
        (x) => x.weightKg,
      ),
    ).toEqual([70]);
    expect(
      pickLastSessionSets(rows, 'bench', {
        deletedWorkoutIds: new Set(['w2']),
      }),
    ).toHaveLength(1);
    expect(
      pickLastSessionSets(rows, 'bench', { deletedSetIds: new Set(['b2']) }),
    ).toHaveLength(1);
  });

  it('ignores unchecked rows and lets later duplicates win', () => {
    const withOverlay = [
      ...rows,
      row('b1', 'w2', 0, '2026-10-05T10:00:00Z', 76),
      row('x', 'w4', 0, null, 200),
    ];
    expect(pickLastSessionSets(withOverlay, 'bench')[0]!.weightKg).toBe(76);
    expect(pickLastSessionSets([], 'bench')).toEqual([]);
  });
});

describe('topSet', () => {
  it('picks the heaviest, then the most reps', () => {
    expect(topSet([s(80, 8), s(82.5, 5), s(82.5, 6)])).toEqual(s(82.5, 6));
    expect(topSet([])).toBeNull();
  });
  it('picks the farthest for cardio', () => {
    const a = { ...EMPTY_PREFILL, distanceM: 5000, durationS: 1500 };
    const b = { ...EMPTY_PREFILL, distanceM: 6000, durationS: 1800 };
    expect(topSet([a, b])).toEqual(b);
  });
});

describe('focus', () => {
  const p = (done: number, total: number) => ({ done, total });

  it('moves to the next unfinished exercise, wrapping around', () => {
    expect(nextFocusIndex([p(3, 3), p(0, 3), p(0, 3)], 0)).toBe(1);
    expect(nextFocusIndex([p(0, 3), p(3, 3), p(3, 3)], 2)).toBe(0);
    expect(nextFocusIndex([p(3, 3), p(3, 3)], 0)).toBeNull();
    expect(nextFocusIndex([], 0)).toBeNull();
  });

  it('starts at the first unfinished exercise', () => {
    expect(initialFocusIndex([p(3, 3), p(1, 3)])).toBe(1);
    expect(initialFocusIndex([p(3, 3)])).toBe(0);
    expect(initialFocusIndex([])).toBeNull();
    expect(initialFocusIndex([p(0, 0)])).toBe(0);
  });
});
