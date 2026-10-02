import { overlayRoutines } from './routinesMerge';
import type { Routine } from './types';

const server: Routine[] = [
  {
    id: 'r1',
    userId: 'u',
    name: 'Push',
    exercises: [
      {
        id: 'e1',
        routineId: 'r1',
        exerciseId: 'x1',
        orderIndex: 0,
        targetSets: 3,
        targetReps: 8,
      },
      {
        id: 'e2',
        routineId: 'r1',
        exerciseId: 'x2',
        orderIndex: 1,
        targetSets: 3,
        targetReps: 8,
      },
    ],
  },
  { id: 'r2', userId: 'u', name: 'Pull', exercises: [] },
];

const base = {
  userId: 'u',
  routineUpserts: [] as Record<string, unknown>[],
  routineDeleteIds: new Set<string>(),
  exerciseUpserts: [] as Record<string, unknown>[],
  exerciseDeleteIds: new Set<string>(),
};

describe('overlayRoutines', () => {
  it('returns the server state when nothing is pending', () => {
    expect(overlayRoutines({ ...base, server })).toEqual(server);
  });

  it('hides a routine with a queued delete immediately', () => {
    const out = overlayRoutines({
      ...base,
      server,
      routineDeleteIds: new Set(['r1']),
    });
    expect(out.map((r) => r.id)).toEqual(['r2']);
  });

  it('shows a routine created offline (incl. its pending exercises, ordered)', () => {
    const out = overlayRoutines({
      ...base,
      server,
      routineUpserts: [{ id: 'n', user_id: 'u', name: 'Legs' }],
      exerciseUpserts: [
        {
          id: 'n2',
          routine_id: 'n',
          exercise_id: 'x2',
          order_index: 1,
          target_sets: 4,
          target_reps: null,
        },
        {
          id: 'n1',
          routine_id: 'n',
          exercise_id: 'x1',
          order_index: 0,
          target_sets: 3,
          target_reps: 10,
        },
      ],
    });
    const created = out.find((r) => r.id === 'n');
    expect(created?.name).toBe('Legs');
    expect(created?.exercises.map((e) => e.id)).toEqual(['n1', 'n2']);
    expect(out[out.length - 1].id).toBe('n');
  });

  it('applies a queued rename and an edited exercise list (old rows deleted, new rows added)', () => {
    const out = overlayRoutines({
      ...base,
      server,
      routineUpserts: [{ id: 'r1', user_id: 'u', name: 'Push Day' }],
      exerciseDeleteIds: new Set(['e1', 'e2']),
      exerciseUpserts: [
        {
          id: 'k1',
          routine_id: 'r1',
          exercise_id: 'x3',
          order_index: 0,
          target_sets: 5,
          target_reps: 5,
        },
      ],
    });
    const r1 = out.find((r) => r.id === 'r1');
    expect(r1?.name).toBe('Push Day');
    expect(r1?.exercises.map((e) => e.exerciseId)).toEqual(['x3']);
  });

  it("ignores another user's pending routine and does not mutate the input", () => {
    const snapshot = JSON.stringify(server);
    const out = overlayRoutines({
      ...base,
      server,
      routineUpserts: [{ id: 'z', user_id: 'someone-else', name: 'Nope' }],
      exerciseDeleteIds: new Set(['e1']),
    });
    expect(out.find((r) => r.id === 'z')).toBeUndefined();
    expect(JSON.stringify(server)).toBe(snapshot);
  });
});
