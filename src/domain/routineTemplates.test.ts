import {
  allTemplatePlans,
  bareExerciseKey,
  clampDaysPerWeek,
  indexCatalogByNameKey,
  pickTemplate,
  resolveTemplate,
  templateTargetReps,
} from './routineTemplates';

describe('routine templates', () => {
  const plans = allTemplatePlans();

  it('has 4–8 exercises per routine, no duplicates', () => {
    for (const plan of plans) {
      for (const routine of plan.routines) {
        expect(routine.exercises.length).toBeGreaterThanOrEqual(4);
        expect(routine.exercises.length).toBeLessThanOrEqual(8);
        const keys = routine.exercises.map((e) => e.nameKey);
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it('gives every exercise either a rep range or a duration', () => {
    for (const plan of plans) {
      for (const ex of plan.routines.flatMap((r) => r.exercises)) {
        expect(ex.sets).toBeGreaterThanOrEqual(1);
        if (ex.durationMin != null) {
          expect(ex.durationMin).toBeGreaterThan(0);
        } else {
          expect(ex.repsMin).toBeGreaterThan(0);
          expect(ex.repsMax!).toBeGreaterThanOrEqual(ex.repsMin!);
        }
      }
    }
  });

  it('uses i18n keys under trainingSetup.templates', () => {
    for (const routine of plans.flatMap((p) => p.routines)) {
      expect(routine.nameKey.startsWith('trainingSetup.templates.')).toBe(true);
    }
  });
});

describe('pickTemplate', () => {
  it('picks full body A/B for 2–3 days', () => {
    for (const d of [2, 3]) {
      const plan = pickTemplate('gym', d);
      expect(plan.split).toBe('fullBody');
      expect(plan.routines.map((r) => r.id)).toEqual([
        'gym-fullBodyA',
        'gym-fullBodyB',
      ]);
    }
  });

  it('picks upper/lower for 4 days', () => {
    expect(pickTemplate('home', 4).routines.map((r) => r.id)).toEqual([
      'home-upper',
      'home-lower',
    ]);
  });

  it('picks push/pull/legs for 5–6 days', () => {
    for (const d of [5, 6]) {
      expect(pickTemplate('gym', d).routines.map((r) => r.id)).toEqual([
        'gym-push',
        'gym-pull',
        'gym-legs',
      ]);
    }
  });

  it('gives endurance 1 routine at 2–3 days, 2 from 4 days', () => {
    expect(pickTemplate('endurance', 2).routines).toHaveLength(1);
    expect(pickTemplate('endurance', 3).routines).toHaveLength(1);
    expect(pickTemplate('endurance', 4).routines).toHaveLength(2);
    expect(pickTemplate('endurance', 6).routines).toHaveLength(2);
  });

  it('home templates differ from gym templates', () => {
    const gym = pickTemplate('gym', 3).routines[0]!.exercises.map(
      (e) => e.nameKey,
    );
    const home = pickTemplate('home', 3).routines[0]!.exercises.map(
      (e) => e.nameKey,
    );
    expect(home).not.toEqual(gym);
    expect(home).not.toContain('bench_press');
  });

  it('clamps out-of-range frequencies', () => {
    expect(clampDaysPerWeek(1)).toBe(2);
    expect(clampDaysPerWeek(9)).toBe(6);
    expect(clampDaysPerWeek(null)).toBe(3);
    expect(pickTemplate('gym', 0).split).toBe('fullBody');
    expect(pickTemplate('gym', 7).split).toBe('ppl');
  });
});

describe('resolveTemplate', () => {
  const catalog = [
    { id: 'id-squat', nameKey: 'exercise.squat' },
    { id: 'id-bench', nameKey: 'exercise.bench_press' },
    { id: 'id-custom', nameKey: null },
  ];

  it('maps keys to catalog ids and skips missing ones silently', () => {
    const template = pickTemplate('gym', 2).routines[0]!;
    const resolved = resolveTemplate(template, indexCatalogByNameKey(catalog));
    expect(resolved.templateId).toBe('gym-fullBodyA');
    expect(resolved.exercises.map((e) => e.exerciseId)).toEqual([
      'id-squat',
      'id-bench',
    ]);
    expect(resolved.exercises[0]).toMatchObject({
      sets: 3,
      repsMin: 6,
      repsMax: 8,
      durationMin: null,
    });
  });

  it('accepts a map keyed by the prefixed catalog key too', () => {
    const map = new Map([['exercise.squat', { id: 'x' }]]);
    const resolved = resolveTemplate(pickTemplate('gym', 2).routines[0]!, map);
    expect(resolved.exercises.map((e) => e.exerciseId)).toEqual(['x']);
  });

  it('keeps durations for timed exercises', () => {
    const map = new Map([['running_outdoor', { id: 'run' }]]);
    const resolved = resolveTemplate(
      pickTemplate('endurance', 2).routines[0]!,
      map,
    );
    expect(resolved.exercises).toEqual([
      {
        exerciseId: 'run',
        nameKey: 'running_outdoor',
        sets: 1,
        repsMin: null,
        repsMax: null,
        durationMin: 30,
      },
    ]);
  });
});

describe('helpers', () => {
  it('strips the exercise prefix', () => {
    expect(bareExerciseKey('exercise.squat')).toBe('squat');
    expect(bareExerciseKey('squat')).toBe('squat');
  });

  it('stores the top of the rep range as target', () => {
    expect(templateTargetReps({ repsMin: 8, repsMax: 10 })).toBe(10);
    expect(templateTargetReps({ repsMin: null, repsMax: null })).toBeNull();
  });
});
