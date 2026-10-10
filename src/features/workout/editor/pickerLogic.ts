/**
 * Pure exercise-picker logic (no RN/Expo imports, tested in pickerLogic.test.ts):
 * muscle-chip order and the Recent / Popular / A–Z sections.
 */
import type { Exercise } from '../types';

/** Catalog `name_key`s shown under "Popular" (staples of most gym routines). */
export const POPULAR_NAME_KEYS: readonly string[] = [
  'exercise.bench_press',
  'exercise.squat',
  'exercise.deadlift',
  'exercise.overhead_press',
  'exercise.pull_up',
  'exercise.lat_pulldown',
  'exercise.barbell_row',
  'exercise.romanian_deadlift',
  'exercise.leg_press',
  'exercise.dumbbell_curl',
  'exercise.tricep_pushdown',
  'exercise.lateral_raise',
  'exercise.hip_thrust',
  'exercise.plank',
];

/** Display order of the muscle chips; unknown groups follow alphabetically. */
export const MUSCLE_ORDER: readonly string[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'full_body',
  'cardio',
  'forearms',
  'adductors',
  'abductors',
];

export function orderMuscleGroups(groups: readonly string[]): string[] {
  const rank = (g: string) => {
    const i = MUSCLE_ORDER.indexOf(g);
    return i === -1 ? MUSCLE_ORDER.length : i;
  };
  return [...new Set(groups)].sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b),
  );
}

export interface PickerSections {
  recent: Exercise[];
  popular: Exercise[];
  /** A–Z (or the filtered result when a search/muscle filter is active). */
  all: Exercise[];
  filtered: boolean;
}

export function buildPickerSections(opts: {
  exercises: readonly Exercise[];
  recentIds: readonly string[];
  query: string;
  muscleGroup: string | null;
  nameOf: (e: Exercise) => string;
  /** Hidden entirely (e.g. the exercise being swapped out). */
  excludeIds?: readonly string[];
}): PickerSections {
  const exclude = new Set(opts.excludeIds ?? []);
  const pool = opts.exercises.filter((e) => !exclude.has(e.id));
  const q = opts.query.trim().toLocaleLowerCase();
  const filtered = q.length > 0 || opts.muscleGroup !== null;

  const names = new Map(pool.map((e) => [e.id, opts.nameOf(e)]));
  const byName = (a: Exercise, b: Exercise) =>
    (names.get(a.id) ?? '').localeCompare(names.get(b.id) ?? '');

  if (filtered) {
    const all = pool
      .filter((e) => {
        if (opts.muscleGroup && !e.muscleGroups.includes(opts.muscleGroup))
          return false;
        if (!q) return true;
        return (names.get(e.id) ?? '').toLocaleLowerCase().includes(q);
      })
      .sort(byName);
    return { recent: [], popular: [], all, filtered };
  }

  const byId = new Map(pool.map((e) => [e.id, e]));
  const recent = opts.recentIds
    .map((id) => byId.get(id))
    .filter((e): e is Exercise => !!e);
  const recentSet = new Set(recent.map((e) => e.id));
  const byKey = new Map(
    pool.filter((e) => e.nameKey).map((e) => [e.nameKey as string, e]),
  );
  const popular = POPULAR_NAME_KEYS.map((k) => byKey.get(k)).filter(
    (e): e is Exercise => !!e && !recentSet.has(e.id),
  );
  return { recent, popular, all: [...pool].sort(byName), filtered };
}
