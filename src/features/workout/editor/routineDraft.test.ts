import { allTemplatePlans } from '@/domain/routineTemplates';
import {
  appendExercises,
  canSaveRoutine,
  defaultTarget,
  draftFromStored,
  draftFromTemplate,
  templatesBySetting,
  formatTarget,
  hasRange,
  moveItem,
  repMinsOf,
  stepMinutes,
  swapExercise,
  toRoutineInput,
  linkDraftWithNext,
  normalizeDraftGroups,
  unlinkDraft,
  toggleRange,
  withRepsMax,
  withRepsMin,
  withSets,
  type DraftExercise,
  type ExerciseMeta,
} from './routineDraft';

const bench: DraftExercise = {
  exerciseId: 'bench',
  trackingType: 'weight_reps',
  sets: 3,
  repsMin: 8,
  repsMax: 10,
};
const run: DraftExercise = {
  exerciseId: 'run',
  trackingType: 'distance_duration',
  sets: 1,
  repsMin: 30,
  repsMax: 30,
};
const META: Record<string, ExerciseMeta> = {
  bench: { trackingType: 'weight_reps', category: 'strength' },
  ohp: { trackingType: 'weight_reps', category: 'strength' },
  plank: { trackingType: 'duration', category: 'strength' },
  run: { trackingType: 'distance_duration', category: 'cardio' },
};

describe('defaultTarget', () => {
  it('uses 3 x 8–10 for rep exercises', () => {
    expect(defaultTarget('weight_reps')).toEqual({
      sets: 3,
      repsMin: 8,
      repsMax: 10,
    });
  });
  it('uses one 30 min block for cardio and 3 x 1 min for holds', () => {
    expect(defaultTarget('distance_duration', 'cardio')).toEqual({
      sets: 1,
      repsMin: 30,
      repsMax: 30,
    });
    expect(defaultTarget('duration', 'strength').sets).toBe(3);
  });
});

describe('steppers', () => {
  it('clamps sets to 1–8', () => {
    expect(withSets(bench, 0).sets).toBe(1);
    expect(withSets(bench, 9).sets).toBe(8);
  });
  it('keeps min <= max in both directions', () => {
    expect(withRepsMin(bench, 12)).toMatchObject({ repsMin: 12, repsMax: 12 });
    expect(withRepsMax(bench, 6)).toMatchObject({ repsMin: 6, repsMax: 6 });
    expect(withRepsMax(bench, 31).repsMax).toBe(30);
    expect(withRepsMin(bench, 0).repsMin).toBe(1);
  });
  it('treats minutes as a single value', () => {
    expect(withRepsMax(run, 45)).toMatchObject({ repsMin: 45, repsMax: 45 });
  });
  it('steps minutes by 1 up to 10, then by 5', () => {
    expect(stepMinutes(9, 1)).toBe(10);
    expect(stepMinutes(10, 1)).toBe(15);
    expect(stepMinutes(12, 1)).toBe(15);
    expect(stepMinutes(15, -1)).toBe(10);
    expect(stepMinutes(12, -1)).toBe(10);
    expect(stepMinutes(1, -1)).toBe(1);
  });
  it('toggles the range on and off', () => {
    const single = toggleRange(bench);
    expect(hasRange(single)).toBe(false);
    expect(single.repsMax).toBe(10);
    expect(toggleRange(single)).toMatchObject({ repsMin: 8, repsMax: 10 });
  });
});

describe('formatTarget', () => {
  it('formats ranges, single reps and minutes', () => {
    expect(formatTarget(bench)).toEqual({
      kind: 'reps',
      sets: 3,
      value: '8–10',
    });
    expect(formatTarget({ ...bench, repsMin: 10 }).value).toBe('10');
    expect(formatTarget(run)).toEqual({
      kind: 'minutes',
      sets: 1,
      value: '30',
    });
  });
});

describe('moveItem', () => {
  it('moves up and down', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b']);
  });
  it('ignores out-of-range moves', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 2)).toEqual(['a', 'b']);
  });
});

describe('appendExercises / swapExercise', () => {
  const metaFor = (id: string) => META[id];
  it('appends with defaults and skips duplicates', () => {
    const next = appendExercises(
      [bench],
      ['bench', 'ohp', 'run', 'ohp'],
      metaFor,
    );
    expect(next.map((d) => d.exerciseId)).toEqual(['bench', 'ohp', 'run']);
    expect(next[2]).toMatchObject({ sets: 1, repsMax: 30 });
  });
  it('keeps targets when the kind matches', () => {
    const next = swapExercise([bench, run], 0, 'ohp', META.ohp);
    expect(next[0]).toEqual({ ...bench, exerciseId: 'ohp' });
  });
  it('resets targets when the kind changes', () => {
    const next = swapExercise([bench], 0, 'plank', META.plank);
    expect(next[0]).toMatchObject({
      exerciseId: 'plank',
      trackingType: 'duration',
      repsMax: 1,
    });
  });
  it('is a no-op for an exercise already in the routine', () => {
    expect(swapExercise([bench, run], 0, 'run', META.run)).toEqual([
      bench,
      run,
    ]);
  });
});

describe('stored <-> draft', () => {
  it('restores the remembered lower bound', () => {
    const d = draftFromStored(
      { exerciseId: 'bench', targetSets: 4, targetReps: 12 },
      META.bench,
      8,
    );
    expect(d).toMatchObject({ sets: 4, repsMin: 8, repsMax: 12 });
  });
  it('fills defaults for missing targets and ignores a stale lower bound', () => {
    expect(
      draftFromStored(
        { exerciseId: 'bench', targetSets: null, targetReps: null },
        META.bench,
        undefined,
      ),
    ).toMatchObject({ sets: 3, repsMin: 10, repsMax: 10 });
    expect(
      draftFromStored(
        { exerciseId: 'bench', targetSets: 3, targetReps: 6 },
        META.bench,
        8,
      ).repsMin,
    ).toBe(6);
  });
  it('writes the upper bound / minutes and remembers only real ranges', () => {
    expect(toRoutineInput([bench, run])).toEqual([
      {
        exerciseId: 'bench',
        targetSets: 3,
        targetReps: 10,
        targetRepsMin: 8,
        supersetGroup: null,
      },
      {
        exerciseId: 'run',
        targetSets: 1,
        targetReps: 30,
        targetRepsMin: null,
        supersetGroup: null,
      },
    ]);
    expect(
      repMinsOf([bench, run, { ...bench, exerciseId: 'x', repsMin: 10 }]),
    ).toEqual({
      bench: 8,
    });
  });
});

describe('canSaveRoutine', () => {
  it('needs a name and at least one exercise', () => {
    expect(canSaveRoutine('  ', [bench])).toBe(false);
    expect(canSaveRoutine('Push', [])).toBe(false);
    expect(canSaveRoutine('Push', [bench])).toBe(true);
  });
});

describe('templates', () => {
  it('maps resolved template exercises incl. ranges and minutes', () => {
    const d = draftFromTemplate(
      [
        {
          exerciseId: 'bench',
          nameKey: 'bench_press',
          sets: 4,
          repsMin: 6,
          repsMax: 8,
          durationMin: null,
        },
        {
          exerciseId: 'run',
          nameKey: 'running_outdoor',
          sets: 1,
          repsMin: null,
          repsMax: null,
          durationMin: 25,
        },
        {
          exerciseId: 'bench',
          nameKey: 'bench_press',
          sets: 3,
          repsMin: 8,
          repsMax: 10,
          durationMin: null,
        },
      ],
      (id) => META[id],
    );
    expect(d).toEqual([
      {
        exerciseId: 'bench',
        trackingType: 'weight_reps',
        sets: 4,
        repsMin: 6,
        repsMax: 8,
      },
      {
        exerciseId: 'run',
        trackingType: 'distance_duration',
        sets: 1,
        repsMin: 25,
        repsMax: 25,
      },
    ]);
  });
  it('lists every template once, grouped by setting', () => {
    const groups = templatesBySetting(allTemplatePlans());
    expect(groups.map((g) => g.setting)).toEqual(['gym', 'home', 'endurance']);
    const ids = groups.flatMap((g) => g.templates.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(groups[0]?.templates.length).toBeGreaterThanOrEqual(7);
  });
});

describe('supersets in the draft', () => {
  const ohp: DraftExercise = { ...bench, exerciseId: 'ohp' };
  const row: DraftExercise = { ...bench, exerciseId: 'row' };

  it('links, saves and unlinks groups', () => {
    const linked = linkDraftWithNext([bench, ohp, row], 0);
    expect(linked.map((d) => d.supersetGroup)).toEqual([1, 1, null]);
    expect(toRoutineInput(linked).map((r) => r.supersetGroup)).toEqual([
      1,
      1,
      null,
    ]);
    const circuit = linkDraftWithNext(linked, 1);
    expect(circuit.map((d) => d.supersetGroup)).toEqual([1, 1, 1]);
    expect(unlinkDraft(circuit, 2).map((d) => d.supersetGroup)).toEqual([
      1,
      1,
      null,
    ]);
  });

  it('dissolves a group broken up by a move', () => {
    const linked = linkDraftWithNext([bench, ohp, row], 0);
    const moved = normalizeDraftGroups(moveItem(linked, 1, 2));
    expect(moved.map((d) => d.supersetGroup)).toEqual([null, null, null]);
  });

  it('restores the stored group', () => {
    expect(
      draftFromStored(
        {
          exerciseId: 'bench',
          targetSets: 3,
          targetReps: 10,
          supersetGroup: 2,
        },
        META.bench,
        8,
      ).supersetGroup,
    ).toBe(2);
  });
});
