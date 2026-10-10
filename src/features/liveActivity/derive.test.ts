import {
  activityPropsKey,
  buildActivityProps,
  deriveActivityState,
  exerciseShortName,
  formatWeight,
  pickCurrentExercise,
  pickCurrentSet,
  type SessionExerciseLike,
  type SessionLike,
  type SessionSetLike,
} from './derive';
import type { WorkoutActivityLabels, WorkoutActivityState } from './types';

const labels: WorkoutActivityLabels = {
  locale: 'de-DE',
  setOf: (c, t) => `Satz ${c} von ${t}`,
  weightReps: (w, u, r) => `${w} ${u} × ${r}`,
  weight: (w, u) => `${w} ${u}`,
  reps: (r) => `${r} Wdh.`,
  rest: 'Pause',
  elapsed: 'Laufzeit',
};

function set(
  weightKg: number | null,
  reps: number | null,
  done = false,
): SessionSetLike {
  return {
    weightKg,
    reps,
    completedAt: done ? '2026-10-10T10:00:00.000Z' : null,
  };
}

const bench: SessionExerciseLike = {
  exerciseId: 'bench',
  sets: [set(80, 8, true), set(null, null), set(null, null)],
};
const squat: SessionExerciseLike = {
  exerciseId: 'squat',
  sets: [set(100, 5), set(100, 5)],
};

const NOW = Date.parse('2026-10-10T10:05:00.000Z');
const session: SessionLike = {
  workoutId: 'w1',
  startedAt: '2026-10-10T09:50:00.000Z',
  exercises: [bench, squat],
  restEndsAt: NOW + 72_000,
  restTotalSeconds: 90,
};
const ctx = {
  routineName: 'Push A',
  exerciseName: (id: string) => (id === 'bench' ? 'Bankdrücken' : 'Kniebeuge'),
  unit: 'kg' as const,
  labels,
  nowMs: NOW,
};

describe('pickCurrentExercise', () => {
  it('prefers the focused exercise', () => {
    expect(pickCurrentExercise([bench, squat], 'squat')).toBe(squat);
  });
  it('falls back to the first exercise with an open set', () => {
    const doneBench = { ...bench, sets: [set(80, 8, true)] };
    expect(pickCurrentExercise([doneBench, squat], 'missing')).toBe(squat);
  });
  it('returns the last exercise when everything is done, null when empty', () => {
    const a = { exerciseId: 'a', sets: [set(1, 1, true)] };
    const b = { exerciseId: 'b', sets: [set(1, 1, true)] };
    expect(pickCurrentExercise([a, b])).toBe(b);
    expect(pickCurrentExercise([])).toBeNull();
  });
});

describe('pickCurrentSet', () => {
  it('takes the first open set and inherits values of the last done one', () => {
    expect(pickCurrentSet(bench)).toEqual({
      setIndex: 1,
      setCount: 3,
      weightKg: 80,
      reps: 8,
    });
  });
  it("keeps the set's own values", () => {
    const ex = { exerciseId: 'x', sets: [set(80, 8, true), set(85, null)] };
    expect(pickCurrentSet(ex)).toMatchObject({ weightKg: 85, reps: 8 });
  });
  it('uses the last set when all are done', () => {
    const ex = {
      exerciseId: 'x',
      sets: [set(80, 8, true), set(82.5, 6, true)],
    };
    expect(pickCurrentSet(ex)).toEqual({
      setIndex: 1,
      setCount: 2,
      weightKg: 82.5,
      reps: 6,
    });
  });
  it('handles an exercise without sets', () => {
    expect(pickCurrentSet({ exerciseId: 'x', sets: [] }).setCount).toBe(0);
  });
});

describe('deriveActivityState', () => {
  it('returns null without an active workout', () => {
    expect(
      deriveActivityState({ ...session, workoutId: null }, ctx),
    ).toBeNull();
    expect(
      deriveActivityState({ ...session, startedAt: null }, ctx),
    ).toBeNull();
  });

  it('maps the session incl. running rest', () => {
    const state = deriveActivityState(session, ctx);
    expect(state).toMatchObject({
      routineName: 'Push A',
      exerciseName: 'Bankdrücken',
      setIndex: 1,
      setCount: 3,
      weightKg: 80,
      reps: 8,
      unit: 'kg',
      startedAt: '2026-10-10T09:50:00.000Z',
      restEndsAt: new Date(NOW + 72_000).toISOString(),
      restStartedAt: new Date(NOW + 72_000 - 90_000).toISOString(),
    });
  });

  it('drops an expired rest and an unknown rest length', () => {
    expect(
      deriveActivityState({ ...session, restEndsAt: NOW - 1 }, ctx)?.restEndsAt,
    ).toBeNull();
    const noTotal = deriveActivityState(
      { ...session, restTotalSeconds: null },
      ctx,
    );
    expect(noTotal?.restEndsAt).not.toBeNull();
    expect(noTotal?.restStartedAt).toBeNull();
  });

  it('works without exercises', () => {
    const state = deriveActivityState({ ...session, exercises: [] }, ctx);
    expect(state).toMatchObject({ exerciseName: '', setCount: 0 });
  });
});

describe('formatWeight', () => {
  it('formats metric per locale', () => {
    expect(formatWeight(82.5, 'kg', 'de-DE')).toBe('82,5');
    expect(formatWeight(80, 'kg', 'en-US')).toBe('80');
  });
  it('converts to lb for display', () => {
    expect(formatWeight(100, 'lb', 'en-US')).toBe('220.5');
  });
});

describe('exerciseShortName', () => {
  it('uses initials for multi-word names', () => {
    expect(exerciseShortName('Bench Press')).toBe('BP');
    expect(exerciseShortName('Romanian deadlift - barbell')).toBe('RDB');
  });
  it('uses the first 4 letters of a single word', () => {
    expect(exerciseShortName('Kniebeuge')).toBe('Knie');
    expect(exerciseShortName('Øvelse')).toBe('Øvel');
  });
  it('returns empty for empty names', () => {
    expect(exerciseShortName('  ')).toBe('');
  });
});

describe('buildActivityProps', () => {
  const base: WorkoutActivityState = deriveActivityState(session, ctx)!;

  it('builds display strings and timestamps', () => {
    expect(buildActivityProps(base)).toEqual({
      routine: 'Push A',
      exercise: 'Bankdrücken',
      exerciseShort: 'Bank',
      setLine: 'Satz 2 von 3 · 80 kg × 8',
      setShort: '2/3',
      startedAtMs: Date.parse('2026-10-10T09:50:00.000Z'),
      restStartMs: NOW + 72_000 - 90_000,
      restEndsAtMs: NOW + 72_000,
      restLabel: 'Pause',
      elapsedLabel: 'Laufzeit',
    });
  });

  it('shows lb and partial loads', () => {
    expect(
      buildActivityProps({ ...base, unit: 'lb', weightKg: 100, reps: 5 })
        .setLine,
    ).toBe('Satz 2 von 3 · 220,5 lb × 5');
    expect(buildActivityProps({ ...base, reps: null }).setLine).toBe(
      'Satz 2 von 3 · 80 kg',
    );
    expect(buildActivityProps({ ...base, weightKg: null }).setLine).toBe(
      'Satz 2 von 3 · 8 Wdh.',
    );
    expect(
      buildActivityProps({ ...base, weightKg: 0, reps: null }).setLine,
    ).toBe('Satz 2 von 3');
  });

  it('omits the set part without sets', () => {
    const props = buildActivityProps({
      ...base,
      setCount: 0,
      setIndex: 0,
      weightKg: null,
      reps: null,
    });
    expect(props.setLine).toBe('');
    expect(props.setShort).toBe('');
  });

  it('ignores an invalid rest start', () => {
    const props = buildActivityProps({
      ...base,
      restStartedAt: base.restEndsAt,
    });
    expect(props.restStartMs).toBeNull();
    expect(
      buildActivityProps({ ...base, restEndsAt: null }).restStartMs,
    ).toBeNull();
  });

  it('is deterministic (stable update key)', () => {
    expect(activityPropsKey(buildActivityProps(base))).toBe(
      activityPropsKey(buildActivityProps({ ...base })),
    );
    expect(activityPropsKey(buildActivityProps(base))).not.toBe(
      activityPropsKey(buildActivityProps({ ...base, setIndex: 2 })),
    );
  });
});
