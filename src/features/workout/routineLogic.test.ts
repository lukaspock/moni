import { mergeRoutinesWithPending, parseTargetInput } from './routineLogic';
import type { Routine } from './types';

const ex = (id: string, routineId: string, order: number) => ({
  id,
  routineId,
  exerciseId: `x-${id}`,
  orderIndex: order,
  targetSets: 3,
  targetReps: 10,
});
const none = {
  routines: [],
  routineExercises: [],
  deletedRoutineIds: new Set<string>(),
  deletedExerciseRowIds: new Set<string>(),
};

describe('parseTargetInput', () => {
  it('parses, clamps and rejects', () => {
    expect(parseTargetInput('')).toBeNull();
    expect(parseTargetInput('0')).toBeNull();
    expect(parseTargetInput('12')).toBe(12);
    expect(parseTargetInput('1a2')).toBe(12);
    expect(parseTargetInput('500')).toBe(99);
  });
});

describe('mergeRoutinesWithPending', () => {
  const server: Routine[] = [
    { id: 'r1', userId: 'u', name: 'Push', exercises: [ex('e1', 'r1', 0)] },
  ];

  it('shows a pending new routine with its exercises in order', () => {
    const out = mergeRoutinesWithPending(
      server,
      {
        ...none,
        routines: [{ id: 'r2', user_id: 'u', name: 'Pull' }],
        routineExercises: [
          {
            id: 'e3',
            routine_id: 'r2',
            exercise_id: 'b',
            order_index: 1,
            target_sets: 3,
            target_reps: 8,
          },
          {
            id: 'e2',
            routine_id: 'r2',
            exercise_id: 'a',
            order_index: 0,
            target_sets: null,
            target_reps: null,
          },
        ],
      },
      'u',
    );
    expect(out.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(out[1].exercises.map((e) => e.id)).toEqual(['e2', 'e3']);
  });

  it('hides deleted routines and replaced exercise rows on edit', () => {
    const out = mergeRoutinesWithPending(
      server,
      {
        ...none,
        routines: [{ id: 'r1', user_id: 'u', name: 'Push 2' }],
        deletedExerciseRowIds: new Set(['e1']),
        routineExercises: [
          {
            id: 'e9',
            routine_id: 'r1',
            exercise_id: 'z',
            order_index: 0,
            target_sets: 4,
            target_reps: 6,
          },
        ],
      },
      'u',
    );
    expect(out[0].name).toBe('Push 2');
    expect(out[0].exercises.map((e) => e.id)).toEqual(['e9']);
    expect(
      mergeRoutinesWithPending(
        server,
        { ...none, deletedRoutineIds: new Set(['r1']) },
        'u',
      ),
    ).toEqual([]);
  });
});
