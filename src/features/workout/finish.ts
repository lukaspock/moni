/**
 * Finishing / discarding the live session, plus the "previous values as
 * placeholders" and PR caches — all offline-first (PLAN §7.4/§7.7).
 */
import { storage } from '@/lib/storage';
import { enqueueUpsert } from '@/lib/outbox';
import { exportWorkoutToHealth } from '@/features/health';
import {
  calculateSessionKcal,
  calculateSetVolume,
  calculateWorkoutBonus,
  deriveSessionCategory,
  estimateOneRepMaxEpley,
  resolveSessionEnd,
} from '@/domain';
import { useActiveWorkoutStore } from './session';
import type { ActiveExercise, Exercise, WorkoutCategory } from './types';
import { defaultMetForCategory } from './exercises';

const LAST_SET_VALUES_KEY = 'workout:lastSetValues';
const BEST_1RM_KEY = 'workout:bestOneRepMaxKg';

// -------------------------------------------------------------------------
// Previous values (placeholders) + PR cache
// -------------------------------------------------------------------------

export interface LastSetValue {
  reps: number | null;
  weightKg: number | null;
  durationS: number | null;
  distanceM: number | null;
}

function readJSON<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}

/** Last logged sets for an exercise (by set index), used as input placeholders in the active workout. */
export function getPreviousSetValues(exerciseId: string): LastSetValue[] {
  const all = readJSON<Record<string, LastSetValue[]>>(LAST_SET_VALUES_KEY, {});
  return all[exerciseId] ?? [];
}

function saveLastSetValues(exerciseId: string, values: LastSetValue[]): void {
  const all = readJSON<Record<string, LastSetValue[]>>(LAST_SET_VALUES_KEY, {});
  all[exerciseId] = values;
  writeJSON(LAST_SET_VALUES_KEY, all);
}

export function getBestOneRepMaxKg(exerciseId: string): number | null {
  const all = readJSON<Record<string, number>>(BEST_1RM_KEY, {});
  return all[exerciseId] ?? null;
}

function updateBestOneRepMaxKg(
  exerciseId: string,
  candidateKg: number,
): { isPR: boolean; previous: number | null } {
  const all = readJSON<Record<string, number>>(BEST_1RM_KEY, {});
  const previous = all[exerciseId] ?? null;
  const isPR = previous === null || candidateKg > previous;
  if (isPR) {
    all[exerciseId] = candidateKg;
    writeJSON(BEST_1RM_KEY, all);
  }
  return { isPR, previous };
}

// -------------------------------------------------------------------------
// Session inspection (for the finish confirmation)
// -------------------------------------------------------------------------

export interface SessionCounts {
  completedSets: number;
  /** Sets with typed values that were never checked off (they will not be saved). */
  uncheckedSetsWithData: number;
}

export function countSessionSets(exercises: ActiveExercise[]): SessionCounts {
  let completedSets = 0;
  let uncheckedSetsWithData = 0;
  for (const e of exercises) {
    for (const s of e.sets) {
      if (s.completedAt !== null) completedSets += 1;
      else if (
        s.reps !== null ||
        s.weightKg !== null ||
        s.durationS !== null ||
        s.distanceM !== null
      )
        uncheckedSetsWithData += 1;
    }
  }
  return { completedSets, uncheckedSetsWithData };
}

// -------------------------------------------------------------------------
// Finishing a workout
// -------------------------------------------------------------------------

export interface FinishWorkoutResult {
  workoutId: string;
  category: WorkoutCategory;
  durationMinutes: number;
  kcalBurned: number;
  volumeKg: number;
  workoutBonusKcal: number;
  prs: {
    exerciseId: string;
    newOneRepMaxKg: number;
    previousOneRepMaxKg: number | null;
  }[];
}

function metForNonStrength(
  category: WorkoutCategory,
  exercises: ActiveExercise[],
  catalog: Exercise[],
): number {
  const withMet = exercises
    .map((e) => catalog.find((c) => c.id === e.exerciseId)?.metValue)
    .filter((m): m is number => typeof m === 'number');
  if (withMet.length > 0)
    return withMet.reduce((a, b) => a + b, 0) / withMet.length;
  return defaultMetForCategory(category) ?? 5;
}

/** Throws the session away (cancel / empty finish). Nothing was queued, so nothing reaches the server. */
export function discardActiveWorkout(): void {
  useActiveWorkoutStore.getState().reset();
}

/**
 * Ends the active session, computes kcal (src/domain/met) + volume + PRs, and
 * queues the `workouts` + `workout_sets` rows in the outbox (workout first —
 * the outbox is FIFO and `workout_sets.workout_id` is a FK). Only checked-off
 * sets are saved. Fully offline: no network calls here. Returns null if there
 * is no active session or not a single set was completed (nothing worth
 * saving — use `discardActiveWorkout`).
 */
export function finishActiveWorkout(opts: {
  userId: string;
  latestWeightKg: number | null;
  eatBackFactor: number;
  exerciseCatalog: Exercise[];
}): FinishWorkoutResult | null {
  const session = useActiveWorkoutStore.getState();
  if (!session.workoutId || !session.startedAt) return null;

  const completedSets = session.exercises.flatMap((e) =>
    e.sets
      .filter((s) => s.completedAt !== null)
      .map((s) => ({ exercise: e, set: s })),
  );
  if (completedSets.length === 0) return null;

  const startedMs = new Date(session.startedAt).getTime();
  const lastCompletedMs = Math.max(
    ...completedSets.map((cs) =>
      new Date(cs.set.completedAt as string).getTime(),
    ),
  );
  const endedMs = resolveSessionEnd(startedMs, lastCompletedMs, Date.now());
  const endedAtIso = new Date(endedMs).toISOString();
  const durationMinutes = Math.max(1, (endedMs - startedMs) / 60000);

  const catalogById = new Map(opts.exerciseCatalog.map((e) => [e.id, e]));
  const category = deriveSessionCategory(
    session.exercises
      .map((e) => catalogById.get(e.exerciseId)?.category)
      .filter((c): c is NonNullable<typeof c> => !!c),
    session.category,
  );

  const kcalBurned = calculateSessionKcal({
    category,
    completedSets: completedSets.length,
    durationMinutes,
    bodyWeightKg: opts.latestWeightKg,
    nonStrengthMet: metForNonStrength(
      category,
      session.exercises,
      opts.exerciseCatalog,
    ),
  });
  const workoutBonusKcal = calculateWorkoutBonus({
    baseKcal: 0,
    actualKcalBurned: kcalBurned,
    eatBackFactor: opts.eatBackFactor,
  }).workoutBonusKcal;

  const volumeKg = calculateSetVolume(
    completedSets
      .filter((cs) => cs.set.reps !== null && cs.set.weightKg !== null)
      .map((cs) => ({
        reps: cs.set.reps as number,
        weightKg: cs.set.weightKg as number,
      })),
  );

  // 1) the workout row, 2) its sets (FIFO + FK).
  enqueueUpsert('workouts', session.workoutId, {
    user_id: opts.userId,
    routine_id: session.routineId,
    started_at: session.startedAt,
    ended_at: endedAtIso,
    category,
    kcal_burned: kcalBurned,
    kcal_source: 'met',
  });
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      if (set.completedAt === null) continue;
      enqueueUpsert('workout_sets', set.id, {
        workout_id: session.workoutId,
        exercise_id: exercise.exerciseId,
        set_index: set.setIndex,
        reps: set.reps,
        weight_kg: set.weightKg,
        rpe: set.rpe,
        duration_s: set.durationS,
        distance_m: set.distanceM,
        completed_at: set.completedAt,
      });
    }
  }
  // Apple Health write-back (fire-and-forget; no-op unless enabled in settings, never blocks this offline flow).
  void exportWorkoutToHealth({
    workoutId: session.workoutId,
    category,
    startedAt: session.startedAt,
    endedAt: endedAtIso,
    kcalBurned,
  });

  // Update "previous values" cache per exercise for future placeholders.
  const byExercise = new Map<string, typeof completedSets>();
  for (const cs of completedSets) {
    const list = byExercise.get(cs.exercise.exerciseId) ?? [];
    list.push(cs);
    byExercise.set(cs.exercise.exerciseId, list);
  }
  const prs: FinishWorkoutResult['prs'] = [];
  for (const [exerciseId, sets] of byExercise) {
    saveLastSetValues(
      exerciseId,
      [...sets]
        .sort((a, b) => a.set.setIndex - b.set.setIndex)
        .map((cs) => ({
          reps: cs.set.reps,
          weightKg: cs.set.weightKg,
          durationS: cs.set.durationS,
          distanceM: cs.set.distanceM,
        })),
    );

    const weightRepsSets = sets.filter(
      (cs) =>
        cs.set.reps !== null &&
        cs.set.reps > 0 &&
        cs.set.weightKg !== null &&
        cs.set.weightKg > 0,
    );
    if (weightRepsSets.length === 0) continue;
    const best1RmThisSession = Math.max(
      ...weightRepsSets.map((cs) =>
        estimateOneRepMaxEpley(
          cs.set.weightKg as number,
          cs.set.reps as number,
        ),
      ),
    );
    const { isPR, previous } = updateBestOneRepMaxKg(
      exerciseId,
      best1RmThisSession,
    );
    if (isPR) {
      prs.push({
        exerciseId,
        newOneRepMaxKg: best1RmThisSession,
        previousOneRepMaxKg: previous,
      });
    }
  }

  const workoutId = session.workoutId;
  useActiveWorkoutStore.getState().reset();

  return {
    workoutId,
    category,
    durationMinutes,
    kcalBurned,
    volumeKg,
    workoutBonusKcal,
    prs,
  };
}
