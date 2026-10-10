/**
 * Routine templates for the training setup flow (docs/identity/06 §2). Pure
 * data + selection logic: exercises are referenced by their catalog
 * `name_key` (without the `exercise.` prefix, see supabase/seed.sql) and get
 * resolved to catalog ids at runtime; a key missing from the catalog is
 * silently skipped.
 */

export type TrainingSetting = 'gym' | 'home' | 'endurance';

export const TRAINING_SETTINGS: readonly TrainingSetting[] = [
  'gym',
  'home',
  'endurance',
];

export const MIN_DAYS_PER_WEEK = 2;
export const MAX_DAYS_PER_WEEK = 6;

/** i18n keys of the routine names (literal union so typed `t()` accepts them). */
export type RoutineTemplateNameKey =
  | 'trainingSetup.templates.fullBodyA'
  | 'trainingSetup.templates.fullBodyB'
  | 'trainingSetup.templates.upper'
  | 'trainingSetup.templates.lower'
  | 'trainingSetup.templates.push'
  | 'trainingSetup.templates.pull'
  | 'trainingSetup.templates.legs'
  | 'trainingSetup.templates.enduranceBase'
  | 'trainingSetup.templates.enduranceIntervals';

export interface TemplateExercise {
  /** Catalog key without the `exercise.` prefix, e.g. `bench_press`. */
  nameKey: string;
  sets: number;
  /** Rep range for set-based exercises. */
  repsMin?: number;
  repsMax?: number;
  /** Target duration for time-based (cardio/mobility) exercises. */
  durationMin?: number;
}

export interface RoutineTemplate {
  id: string;
  nameKey: RoutineTemplateNameKey;
  exercises: TemplateExercise[];
}

export interface TemplatePlan {
  /** e.g. `gym-ppl` */
  id: string;
  setting: TrainingSetting;
  split: 'fullBody' | 'upperLower' | 'ppl' | 'endurance';
  routines: RoutineTemplate[];
}

const reps = (
  nameKey: string,
  sets: number,
  repsMin: number,
  repsMax: number,
): TemplateExercise => ({ nameKey, sets, repsMin, repsMax });

const timed = (nameKey: string, durationMin: number): TemplateExercise => ({
  nameKey,
  sets: 1,
  durationMin,
});

// -- Studio -----------------------------------------------------------------

const GYM_FULL_BODY: RoutineTemplate[] = [
  {
    id: 'gym-fullBodyA',
    nameKey: 'trainingSetup.templates.fullBodyA',
    exercises: [
      reps('squat', 3, 6, 8),
      reps('bench_press', 3, 6, 8),
      reps('lat_pulldown', 3, 8, 10),
      reps('romanian_deadlift', 3, 8, 10),
      reps('lateral_raise', 3, 12, 15),
      reps('cable_crunch', 3, 12, 15),
    ],
  },
  {
    id: 'gym-fullBodyB',
    nameKey: 'trainingSetup.templates.fullBodyB',
    exercises: [
      reps('deadlift', 3, 5, 6),
      reps('overhead_press', 3, 6, 8),
      reps('leg_press', 3, 10, 12),
      reps('seated_cable_row', 3, 8, 10),
      reps('dumbbell_incline_press', 3, 8, 10),
      reps('hanging_leg_raise', 3, 10, 12),
    ],
  },
];

const GYM_UPPER_LOWER: RoutineTemplate[] = [
  {
    id: 'gym-upper',
    nameKey: 'trainingSetup.templates.upper',
    exercises: [
      reps('bench_press', 4, 6, 8),
      reps('barbell_row', 4, 6, 8),
      reps('dumbbell_shoulder_press', 3, 8, 10),
      reps('lat_pulldown', 3, 8, 10),
      reps('dumbbell_curl', 3, 10, 12),
      reps('tricep_pushdown', 3, 10, 12),
    ],
  },
  {
    id: 'gym-lower',
    nameKey: 'trainingSetup.templates.lower',
    exercises: [
      reps('squat', 4, 6, 8),
      reps('romanian_deadlift', 3, 8, 10),
      reps('leg_press', 3, 10, 12),
      reps('leg_curl', 3, 10, 12),
      reps('calf_raise', 3, 12, 15),
      reps('cable_crunch', 3, 12, 15),
    ],
  },
];

const GYM_PPL: RoutineTemplate[] = [
  {
    id: 'gym-push',
    nameKey: 'trainingSetup.templates.push',
    exercises: [
      reps('bench_press', 4, 6, 8),
      reps('dumbbell_incline_press', 3, 8, 10),
      reps('overhead_press', 3, 6, 8),
      reps('lateral_raise', 3, 12, 15),
      reps('tricep_pushdown', 3, 10, 12),
      reps('overhead_tricep_extension', 3, 10, 12),
    ],
  },
  {
    id: 'gym-pull',
    nameKey: 'trainingSetup.templates.pull',
    exercises: [
      reps('deadlift', 3, 5, 6),
      reps('pull_up', 3, 6, 10),
      reps('barbell_row', 3, 8, 10),
      reps('face_pull', 3, 12, 15),
      reps('barbell_curl', 3, 10, 12),
      reps('hammer_curl', 3, 10, 12),
    ],
  },
  {
    id: 'gym-legs',
    nameKey: 'trainingSetup.templates.legs',
    exercises: [
      reps('squat', 4, 6, 8),
      reps('romanian_deadlift', 3, 8, 10),
      reps('leg_press', 3, 10, 12),
      reps('leg_curl', 3, 10, 12),
      reps('leg_extension', 3, 12, 15),
      reps('calf_raise', 4, 12, 15),
    ],
  },
];

// -- Zuhause (Kurzhanteln / Körpergewicht) -----------------------------------

const HOME_FULL_BODY: RoutineTemplate[] = [
  {
    id: 'home-fullBodyA',
    nameKey: 'trainingSetup.templates.fullBodyA',
    exercises: [
      reps('goblet_squat', 3, 10, 12),
      reps('push_up', 3, 8, 15),
      reps('dumbbell_row', 3, 10, 12),
      reps('dumbbell_shoulder_press', 3, 10, 12),
      reps('glute_bridge', 3, 12, 15),
      reps('crunch', 3, 15, 20),
    ],
  },
  {
    id: 'home-fullBodyB',
    nameKey: 'trainingSetup.templates.fullBodyB',
    exercises: [
      reps('bulgarian_split_squat', 3, 8, 10),
      reps('dumbbell_bench_press', 3, 10, 12),
      reps('single_arm_dumbbell_row', 3, 10, 12),
      reps('lunges', 3, 10, 12),
      reps('lateral_raise', 3, 12, 15),
      reps('leg_raise', 3, 10, 15),
    ],
  },
];

const HOME_UPPER_LOWER: RoutineTemplate[] = [
  {
    id: 'home-upper',
    nameKey: 'trainingSetup.templates.upper',
    exercises: [
      reps('push_up', 4, 8, 15),
      reps('dumbbell_row', 4, 10, 12),
      reps('dumbbell_shoulder_press', 3, 10, 12),
      reps('dumbbell_fly', 3, 12, 15),
      reps('dumbbell_curl', 3, 10, 12),
      reps('overhead_tricep_extension', 3, 10, 12),
    ],
  },
  {
    id: 'home-lower',
    nameKey: 'trainingSetup.templates.lower',
    exercises: [
      reps('goblet_squat', 4, 10, 12),
      reps('bulgarian_split_squat', 3, 8, 10),
      reps('glute_bridge', 3, 12, 15),
      reps('step_up', 3, 10, 12),
      reps('calf_raise', 3, 15, 20),
      reps('leg_raise', 3, 10, 15),
    ],
  },
];

const HOME_PPL: RoutineTemplate[] = [
  {
    id: 'home-push',
    nameKey: 'trainingSetup.templates.push',
    exercises: [
      reps('push_up', 4, 8, 15),
      reps('dumbbell_bench_press', 3, 10, 12),
      reps('dumbbell_shoulder_press', 3, 10, 12),
      reps('lateral_raise', 3, 12, 15),
      reps('tricep_dip', 3, 8, 12),
      reps('overhead_tricep_extension', 3, 10, 12),
    ],
  },
  {
    id: 'home-pull',
    nameKey: 'trainingSetup.templates.pull',
    exercises: [
      reps('dumbbell_row', 4, 10, 12),
      reps('single_arm_dumbbell_row', 3, 10, 12),
      reps('dumbbell_pullover', 3, 10, 12),
      reps('reverse_fly', 3, 12, 15),
      reps('dumbbell_curl', 3, 10, 12),
      reps('hammer_curl', 3, 10, 12),
    ],
  },
  {
    id: 'home-legs',
    nameKey: 'trainingSetup.templates.legs',
    exercises: [
      reps('goblet_squat', 4, 10, 12),
      reps('bulgarian_split_squat', 3, 8, 10),
      reps('walking_lunge', 3, 10, 12),
      reps('glute_bridge', 3, 12, 15),
      reps('sumo_squat', 3, 10, 12),
      reps('calf_raise', 4, 15, 20),
    ],
  },
];

// -- Ausdauer / Sport ---------------------------------------------------------

const ENDURANCE_BASE: RoutineTemplate = {
  id: 'endurance-base',
  nameKey: 'trainingSetup.templates.enduranceBase',
  exercises: [
    timed('warm_up_general', 10),
    timed('running_outdoor', 30),
    reps('glute_bridge', 3, 15, 20),
    reps('crunch', 3, 15, 20),
    timed('stretching', 10),
  ],
};

const ENDURANCE_INTERVALS: RoutineTemplate = {
  id: 'endurance-intervals',
  nameKey: 'trainingSetup.templates.enduranceIntervals',
  exercises: [
    timed('warm_up_general', 10),
    timed('hiit_general', 20),
    reps('mountain_climber', 3, 20, 30),
    reps('lunges', 3, 10, 12),
    timed('yoga', 15),
    timed('foam_rolling', 10),
  ],
};

/** Clamps a free number to the supported 2–6 days. */
export function clampDaysPerWeek(days: number | null | undefined): number {
  if (days == null || !Number.isFinite(days)) return 3;
  return Math.min(
    MAX_DAYS_PER_WEEK,
    Math.max(MIN_DAYS_PER_WEEK, Math.round(days)),
  );
}

/** Split used for a given frequency: full body A/B at 2–3, upper/lower at 4, push/pull/legs at 5–6. */
export function splitForDays(
  setting: TrainingSetting,
  daysPerWeek: number,
): TemplatePlan['split'] {
  if (setting === 'endurance') return 'endurance';
  const days = clampDaysPerWeek(daysPerWeek);
  if (days <= 3) return 'fullBody';
  if (days === 4) return 'upperLower';
  return 'ppl';
}

/** The template plan for a setting + weekly frequency (2–6, clamped). */
export function pickTemplate(
  setting: TrainingSetting,
  daysPerWeek: number,
): TemplatePlan {
  const days = clampDaysPerWeek(daysPerWeek);
  const split = splitForDays(setting, days);
  let routines: RoutineTemplate[];
  if (setting === 'endurance') {
    routines =
      days <= 3 ? [ENDURANCE_BASE] : [ENDURANCE_BASE, ENDURANCE_INTERVALS];
  } else if (setting === 'gym') {
    routines =
      split === 'fullBody'
        ? GYM_FULL_BODY
        : split === 'upperLower'
          ? GYM_UPPER_LOWER
          : GYM_PPL;
  } else {
    routines =
      split === 'fullBody'
        ? HOME_FULL_BODY
        : split === 'upperLower'
          ? HOME_UPPER_LOWER
          : HOME_PPL;
  }
  return { id: `${setting}-${split}`, setting, split, routines };
}

/** Every template, for tests and tooling. */
export function allTemplatePlans(): TemplatePlan[] {
  const plans: TemplatePlan[] = [];
  for (const setting of TRAINING_SETTINGS) {
    for (let d = MIN_DAYS_PER_WEEK; d <= MAX_DAYS_PER_WEEK; d++) {
      plans.push(pickTemplate(setting, d));
    }
  }
  return plans;
}

/** Strips the catalog's `exercise.` prefix: `exercise.bench_press` → `bench_press`. */
export function bareExerciseKey(nameKey: string): string {
  return nameKey.startsWith('exercise.')
    ? nameKey.slice('exercise.'.length)
    : nameKey;
}

/** Index of catalog entries by bare name key (custom exercises without a key are skipped). */
export function indexCatalogByNameKey<
  T extends { id: string; nameKey: string | null },
>(catalog: readonly T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const entry of catalog) {
    if (entry.nameKey) map.set(bareExerciseKey(entry.nameKey), entry);
  }
  return map;
}

export interface ResolvedTemplateExercise {
  exerciseId: string;
  nameKey: string;
  sets: number;
  repsMin: number | null;
  repsMax: number | null;
  durationMin: number | null;
}

export interface ResolvedRoutineTemplate {
  templateId: string;
  nameKey: RoutineTemplateNameKey;
  exercises: ResolvedTemplateExercise[];
}

/** Maps a template's exercises to catalog ids; keys missing from the catalog are left out. */
export function resolveTemplate(
  template: RoutineTemplate,
  catalogByNameKey: ReadonlyMap<string, { id: string }>,
): ResolvedRoutineTemplate {
  const exercises: ResolvedTemplateExercise[] = [];
  for (const ex of template.exercises) {
    const entry =
      catalogByNameKey.get(ex.nameKey) ??
      catalogByNameKey.get(`exercise.${ex.nameKey}`);
    if (!entry) continue;
    exercises.push({
      exerciseId: entry.id,
      nameKey: ex.nameKey,
      sets: ex.sets,
      repsMin: ex.repsMin ?? null,
      repsMax: ex.repsMax ?? null,
      durationMin: ex.durationMin ?? null,
    });
  }
  return { templateId: template.id, nameKey: template.nameKey, exercises };
}

/**
 * The single `target_reps` value a routine row can store: the top of the
 * range (the progression hint fires once every set reaches it); null for
 * time-based exercises.
 */
export function templateTargetReps(ex: {
  repsMin: number | null;
  repsMax: number | null;
}): number | null {
  return ex.repsMax ?? ex.repsMin ?? null;
}
