import {
  estimateDurationMin,
  formatClock,
  lastDoneLabel,
  lastPerformedAt,
  nextRoutine,
} from './trainingPlan';

const push = { id: 'r1', name: 'Push' };
const pull = { id: 'r2', name: 'Pull' };
const legs = { id: 'r3', name: 'Beine' };
const routines = [push, pull, legs];

describe('nextRoutine', () => {
  it('returns null without routines', () => {
    expect(nextRoutine([], [])).toBeNull();
  });

  it('starts with the first routine without history', () => {
    expect(nextRoutine(routines, [])).toBe(push);
  });

  it('rotates after the most recent routine workout', () => {
    const workouts = [
      { startedAt: '2026-10-01T10:00:00Z', routineId: 'r1' },
      { startedAt: '2026-10-03T10:00:00Z', routineId: 'r2' },
    ];
    expect(nextRoutine(routines, workouts)).toBe(legs);
  });

  it('wraps around after the last routine', () => {
    expect(
      nextRoutine(routines, [{ startedAt: '2026-10-03', routineId: 'r3' }]),
    ).toBe(push);
  });

  it('ignores free sessions and unknown routines', () => {
    const workouts = [
      { startedAt: '2026-10-05', routineId: null, routineName: null },
      { startedAt: '2026-10-04', routineId: 'deleted' },
      { startedAt: '2026-10-02', routineId: 'r1' },
    ];
    expect(nextRoutine(routines, workouts)).toBe(pull);
  });

  it('falls back to the routine name when no id is known', () => {
    expect(
      nextRoutine(routines, [{ startedAt: '2026-10-02', routineName: 'Pull' }]),
    ).toBe(legs);
  });
});

describe('lastPerformedAt', () => {
  it('finds the newest workout of the routine', () => {
    const workouts = [
      { startedAt: '2026-10-01', routineId: 'r1' },
      { startedAt: '2026-10-06', routineId: 'r1' },
      { startedAt: '2026-10-07', routineId: 'r2' },
    ];
    expect(lastPerformedAt(push, workouts)).toBe('2026-10-06');
    expect(lastPerformedAt(legs, workouts)).toBeNull();
  });
});

describe('estimateDurationMin', () => {
  it('is 0 for an empty routine', () => {
    expect(estimateDurationMin({ exercises: [] })).toBe(0);
  });

  it('estimates a typical push day at about 55 minutes', () => {
    const sets = [4, 3, 3, 3, 3, 3];
    expect(
      estimateDurationMin({
        exercises: sets.map((targetSets) => ({ targetSets })),
      }),
    ).toBe(55);
  });

  it('counts timed exercises by duration and rounds to 5', () => {
    expect(
      estimateDurationMin({
        exercises: [
          { targetSets: 1, timed: true, durationMin: 10 },
          { targetSets: 1, timed: true, durationMin: 30 },
          { targetSets: 1, timed: true, durationMin: null },
        ],
      }),
    ).toBe(60);
  });

  it('assumes 3 sets when none are set', () => {
    expect(estimateDurationMin({ exercises: [{ targetSets: null }] })).toBe(15);
  });
});

describe('lastDoneLabel', () => {
  const now = new Date(2026, 9, 10, 18, 0); // Sat 10 Oct 2026, local
  const at = (d: number, h = 9) => new Date(2026, 9, d, h, 0).toISOString();

  it('distinguishes today, yesterday, this week and older', () => {
    expect(lastDoneLabel(at(10, 7), now).kind).toBe('today');
    expect(lastDoneLabel(at(9, 23), now).kind).toBe('yesterday');
    expect(lastDoneLabel(at(5), now).kind).toBe('weekday');
    expect(lastDoneLabel(at(4), now).kind).toBe('weekday');
    expect(lastDoneLabel(at(3), now).kind).toBe('date');
  });
});

describe('formatClock', () => {
  it('formats minutes and hours', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(23 * 60 + 41)).toBe('23:41');
    expect(formatClock(3723)).toBe('1:02:03');
  });
});
