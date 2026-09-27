/**
 * Workout history, finishing an active session, and "previous values as
 * placeholders" / PR tracking — all offline-first (PLAN §7.4/§7.7).
 */
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { enqueueUpsert, pendingUpsertsForTable, subscribeOutbox } from '@/lib/outbox';
import { useSession } from '@/features/auth';
import {
  calculateKcalBurned,
  calculateSessionDensity,
  calculateSetVolume,
  estimateOneRepMaxEpley,
  estimateStrengthMET,
} from '@/domain/met';
import type { WorkoutSummary } from './index';
import { useActiveWorkoutStore } from './session';
import type { ActiveExercise, Exercise, WorkoutCategory } from './types';
import { defaultMetForCategory } from './exercises';

const FALLBACK_WEIGHT_KG = 75;
const LAST_SET_VALUES_KEY = 'workout:lastSetValues';
const BEST_1RM_KEY = 'workout:bestOneRepMaxKg';

// -------------------------------------------------------------------------
// Previous values (placeholders) + PR cache
// -------------------------------------------------------------------------

interface LastSetValue {
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

function updateBestOneRepMaxKg(exerciseId: string, candidateKg: number): { isPR: boolean; previous: number | null } {
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
// Finishing a workout
// -------------------------------------------------------------------------

export interface FinishWorkoutResult {
  workoutId: string;
  durationMinutes: number;
  kcalBurned: number;
  volumeKg: number;
  workoutBonusKcal: number;
  prs: { exerciseId: string; newOneRepMaxKg: number; previousOneRepMaxKg: number | null }[];
}

function metForNonStrength(category: WorkoutCategory, exercises: ActiveExercise[], catalog: Exercise[]): number {
  const withMet = exercises
    .map((e) => catalog.find((c) => c.id === e.exerciseId)?.metValue)
    .filter((m): m is number => typeof m === 'number');
  if (withMet.length > 0) return withMet.reduce((a, b) => a + b, 0) / withMet.length;
  return defaultMetForCategory(category) ?? 5;
}

/**
 * Ends the active session, computes kcal (src/domain/met) + volume + PRs, and
 * queues the `workouts` + `workout_sets` rows in the outbox. Fully offline:
 * no network calls here. Returns null if there is no active session.
 */
export function finishActiveWorkout(opts: {
  userId: string;
  latestWeightKg: number | null;
  eatBackFactor: number;
  exerciseCatalog: Exercise[];
}): FinishWorkoutResult | null {
  const session = useActiveWorkoutStore.getState();
  if (!session.workoutId || !session.startedAt) return null;

  const endedAt = new Date();
  const startedAt = new Date(session.startedAt);
  const durationMinutes = Math.max(1 / 60, (endedAt.getTime() - startedAt.getTime()) / 60000);
  const weightKg = opts.latestWeightKg ?? FALLBACK_WEIGHT_KG;

  const completedSets = session.exercises.flatMap((e) =>
    e.sets.filter((s) => s.completedAt !== null).map((s) => ({ exercise: e, set: s })),
  );

  let metValue: number;
  if (session.category === 'strength') {
    const density = calculateSessionDensity(completedSets.length, durationMinutes);
    metValue = estimateStrengthMET(density);
  } else {
    metValue = metForNonStrength(session.category, session.exercises, opts.exerciseCatalog);
  }
  const kcalBurned = Math.round(calculateKcalBurned(metValue, weightKg, durationMinutes / 60));
  const workoutBonusKcal = Math.round(kcalBurned * opts.eatBackFactor);

  const volumeKg = calculateSetVolume(
    completedSets
      .filter((cs) => cs.set.reps !== null && cs.set.weightKg !== null)
      .map((cs) => ({ reps: cs.set.reps as number, weightKg: cs.set.weightKg as number })),
  );

  // Queue the workout row.
  enqueueUpsert('workouts', session.workoutId, {
    user_id: opts.userId,
    routine_id: session.routineId,
    started_at: session.startedAt,
    ended_at: endedAt.toISOString(),
    category: session.category,
    kcal_burned: kcalBurned,
    kcal_source: 'met',
  });

  // Queue every set that has any data entered (not just untouched placeholders).
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      const hasData =
        set.reps !== null || set.weightKg !== null || set.durationS !== null || set.distanceM !== null || set.completedAt !== null;
      if (!hasData) continue;
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
      sets
        .sort((a, b) => a.set.setIndex - b.set.setIndex)
        .map((cs) => ({
          reps: cs.set.reps,
          weightKg: cs.set.weightKg,
          durationS: cs.set.durationS,
          distanceM: cs.set.distanceM,
        })),
    );

    const weightRepsSets = sets.filter((cs) => cs.set.reps !== null && cs.set.weightKg !== null);
    if (weightRepsSets.length === 0) continue;
    const best1RmThisSession = Math.max(
      ...weightRepsSets.map((cs) => estimateOneRepMaxEpley(cs.set.weightKg as number, cs.set.reps as number)),
    );
    const { isPR, previous } = updateBestOneRepMaxKg(exerciseId, best1RmThisSession);
    if (isPR) {
      prs.push({ exerciseId, newOneRepMaxKg: best1RmThisSession, previousOneRepMaxKg: previous });
    }
  }

  session.reset();

  return {
    workoutId: session.workoutId,
    durationMinutes,
    kcalBurned,
    volumeKg,
    workoutBonusKcal,
    prs,
  };
}

// -------------------------------------------------------------------------
// History reads (contract: useWorkoutsForDate)
// -------------------------------------------------------------------------

function rowToSummary(row: {
  id: string;
  started_at: string;
  ended_at: string | null;
  category: string;
  kcal_burned: number | null;
}, routineNameById: Map<string, string>, routineId: string | null): WorkoutSummary {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    category: row.category as WorkoutCategory,
    kcalBurned: row.kcal_burned,
    routineName: routineId ? (routineNameById.get(routineId) ?? null) : null,
  };
}

function localDateOf(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fetchRoutineNames(ids: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return new Map();
  const { data } = await supabase.from('routines').select('id, name').in('id', uniqueIds);
  return new Map((data ?? []).map((r) => [r.id, r.name]));
}

export function useWorkoutsForDateImpl(
  userId: string | null,
  date: string,
): { workouts: WorkoutSummary[]; isLoading: boolean } {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [outboxTick, setOutboxTick] = useState(0);

  useEffect(() => subscribeOutbox(() => setOutboxTick((t) => t + 1)), []);

  useEffect(() => {
    // No signed-in user: nothing to load. Don't setState here (nothing has
    // changed to synchronize) — the hook returns the "logged out" result
    // below instead, independent of this effect's internal state.
    if (!userId) return;

    let cancelled = false;
    const uid = userId;

    async function load() {
      setIsLoading(true);
      const dayStart = `${date}T00:00:00.000Z`;
      const dayEnd = `${date}T23:59:59.999Z`;
      const { data } = await supabase
        .from('workouts')
        .select('id, started_at, ended_at, category, kcal_burned, routine_id')
        .eq('user_id', uid)
        .gte('started_at', dayStart)
        .lte('started_at', dayEnd)
        .order('started_at', { ascending: true });

      const serverRows = data ?? [];

      // Overlay unsynced local workouts for this date (offline-finished sessions still in the outbox).
      const pending = pendingUpsertsForTable('workouts').filter((p) => {
        const startedAt = p.started_at as string | undefined;
        return p.user_id === uid && startedAt && localDateOf(startedAt) === date;
      });

      const serverIds = new Set(serverRows.map((r) => r.id));
      const pendingRows = pending
        .filter((p) => !serverIds.has(p.id as string))
        .map((p) => ({
          id: p.id as string,
          started_at: p.started_at as string,
          ended_at: (p.ended_at as string) ?? null,
          category: p.category as string,
          kcal_burned: (p.kcal_burned as number) ?? null,
          routine_id: (p.routine_id as string) ?? null,
        }));

      const allRows = [...serverRows, ...pendingRows];
      const routineNameById = await fetchRoutineNames(allRows.map((r) => r.routine_id).filter((x): x is string => !!x));

      if (!cancelled) {
        setWorkouts(allRows.map((r) => rowToSummary(r, routineNameById, r.routine_id)));
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // outboxTick forces a refresh once pending entries sync or new ones are queued.
  }, [userId, date, outboxTick]);

  if (!userId) return { workouts: [], isLoading: false };
  return { workouts, isLoading };
}

/** Recent workout history (all dates, newest first), for the training tab's history screen. */
export function useWorkoutHistory(limit: number = 50): { workouts: WorkoutSummary[]; isLoading: boolean } {
  const { userId } = useSession();
  return useWorkoutHistoryImpl(userId, limit);
}

/** Internal implementation of `useWorkoutHistory`. */
export function useWorkoutHistoryImpl(
  userId: string | null,
  limit: number = 50,
): { workouts: WorkoutSummary[]; isLoading: boolean } {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [outboxTick, setOutboxTick] = useState(0);

  useEffect(() => subscribeOutbox(() => setOutboxTick((t) => t + 1)), []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const uid = userId;

    async function load() {
      setIsLoading(true);
      const { data } = await supabase
        .from('workouts')
        .select('id, started_at, ended_at, category, kcal_burned, routine_id')
        .eq('user_id', uid)
        .order('started_at', { ascending: false })
        .limit(limit);

      const serverRows = data ?? [];
      const serverIds = new Set(serverRows.map((r) => r.id));
      const pendingRows = pendingUpsertsForTable('workouts')
        .filter((p) => p.user_id === uid && !serverIds.has(p.id as string))
        .map((p) => ({
          id: p.id as string,
          started_at: p.started_at as string,
          ended_at: (p.ended_at as string) ?? null,
          category: p.category as string,
          kcal_burned: (p.kcal_burned as number) ?? null,
          routine_id: (p.routine_id as string) ?? null,
        }));

      const allRows = [...serverRows, ...pendingRows].sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
      const routineNameById = await fetchRoutineNames(allRows.map((r) => r.routine_id).filter((x): x is string => !!x));

      if (!cancelled) {
        setWorkouts(allRows.map((r) => rowToSummary(r, routineNameById, r.routine_id)));
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, limit, outboxTick]);

  if (!userId) return { workouts: [], isLoading: false };
  return { workouts, isLoading };
}
