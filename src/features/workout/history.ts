/**
 * Workout history, finishing an active session, and "previous values as
 * placeholders" / PR tracking — all offline-first (PLAN §7.4/§7.7).
 */
import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { localDayBoundsUtc } from '@/lib/date';
import { storage } from '@/lib/storage';
import {
  enqueueUpsert,
  pendingDeleteIdsForTable,
  pendingUpsertsForTable,
} from '@/lib/outbox';
import { useSession } from '@/features/auth';
import { exportWorkoutToHealth } from '@/features/health';
import {
  calculateSessionDensity,
  calculateSetVolume,
  calculateWorkoutBonus,
  estimateOneRepMaxEpley,
  estimateStrengthMET,
  estimateWorkoutKcal,
} from '@/domain';
import type { WorkoutSummary } from './index';
import { useActiveWorkoutStore } from './session';
import type { ActiveExercise, Exercise, WorkoutCategory } from './types';
import { defaultMetForCategory } from './exercises';
import {
  mergeWorkoutRows,
  rowsForLocalDate,
  type WorkoutListRow,
} from './historyMerge';
import { useOutboxTick } from './useOutboxTick';

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
// Finishing a workout
// -------------------------------------------------------------------------

export interface FinishWorkoutResult {
  workoutId: string;
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
  const durationMinutes = Math.max(
    1 / 60,
    (endedAt.getTime() - startedAt.getTime()) / 60000,
  );

  const completedSets = session.exercises.flatMap((e) =>
    e.sets
      .filter((s) => s.completedAt !== null)
      .map((s) => ({ exercise: e, set: s })),
  );

  let metValue: number;
  if (session.category === 'strength') {
    const density = calculateSessionDensity(
      completedSets.length,
      durationMinutes,
    );
    metValue = estimateStrengthMET(density);
  } else {
    metValue = metForNonStrength(
      session.category,
      session.exercises,
      opts.exerciseCatalog,
    );
  }
  // Only real work earns energy: a strength session without a single completed
  // set (opened and finished/forgotten) must not create an eat-back bonus. The
  // domain helper also caps the credited duration and guards NaN / missing weight.
  const kcalBurned =
    session.category === 'strength' && completedSets.length === 0
      ? 0
      : estimateWorkoutKcal({
          metValue,
          weightKg: opts.latestWeightKg,
          durationMinutes,
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
  // Apple Health write-back (fire-and-forget; no-op unless enabled in settings, never blocks this offline flow).
  void exportWorkoutToHealth({
    workoutId: session.workoutId,
    category: session.category,
    startedAt: session.startedAt,
    endedAt: endedAt.toISOString(),
    kcalBurned,
  });

  // Queue every set that has any data entered (not just untouched placeholders).
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      const hasData =
        set.reps !== null ||
        set.weightKg !== null ||
        set.durationS !== null ||
        set.distanceM !== null ||
        set.completedAt !== null;
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

    const weightRepsSets = sets.filter(
      (cs) => cs.set.reps !== null && cs.set.weightKg !== null,
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

function rowToSummary(
  row: WorkoutListRow,
  routineNameById: Map<string, string>,
): WorkoutSummary {
  return {
    isFromHealth: !!row.healthkit_uuid,
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    category: row.category as WorkoutCategory,
    kcalBurned: row.kcal_burned,
    routineName: row.routine_id
      ? (routineNameById.get(row.routine_id) ?? null)
      : null,
  };
}

const WORKOUT_COLUMNS =
  'id, started_at, ended_at, category, kcal_burned, routine_id, healthkit_uuid';

/** Names of the routines referenced by `routineIds`: server rows plus not-yet-synced local ones. */
async function fetchRoutineNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return names;
  const { data } = await supabase
    .from('routines')
    .select('id, name')
    .in('id', uniqueIds);
  for (const r of data ?? []) names.set(r.id, r.name);
  for (const p of pendingUpsertsForTable('routines')) {
    if (typeof p.name === 'string') names.set(p.id as string, p.name);
  }
  for (const id of pendingDeleteIdsForTable('routines')) names.delete(id);
  return names;
}

/**
 * Server read + outbox overlay. On a failed read (offline) the last successful
 * server rows are reused (`fallback`) so synced history doesn't vanish and the
 * Today budget doesn't lose its workout bonus while offline.
 */
async function loadMergedWorkouts(params: {
  userId: string;
  fetchServer: () => Promise<WorkoutListRow[] | null>;
  fallback: WorkoutListRow[] | null;
}): Promise<{ rows: WorkoutListRow[]; server: WorkoutListRow[] | null }> {
  const server = await params.fetchServer();
  const base = server ?? params.fallback ?? [];
  const rows = mergeWorkoutRows(
    base,
    pendingUpsertsForTable('workouts'),
    pendingDeleteIdsForTable('workouts'),
    params.userId,
  );
  return { rows, server };
}

export function useWorkoutsForDateImpl(
  userId: string | null,
  date: string,
): { workouts: WorkoutSummary[]; isLoading: boolean } {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const outboxTick = useOutboxTick();
  const lastServer = useRef<{ key: string; rows: WorkoutListRow[] } | null>(
    null,
  );

  useEffect(() => {
    // No signed-in user: nothing to load. Don't setState here (nothing has
    // changed to synchronize) — the hook returns the "logged out" result
    // below instead, independent of this effect's internal state.
    if (!userId) return;

    let cancelled = false;
    const uid = userId;
    const key = `${uid}|${date}`;

    async function load() {
      setIsLoading(true);
      // Local-day bounds (not UTC) so late-evening workouts stay on their local date.
      const { start: dayStart, end: dayEnd } = localDayBoundsUtc(date);
      const { rows, server } = await loadMergedWorkouts({
        userId: uid,
        fallback:
          lastServer.current?.key === key ? lastServer.current.rows : null,
        fetchServer: async () => {
          const { data, error } = await supabase
            .from('workouts')
            .select(WORKOUT_COLUMNS)
            .eq('user_id', uid)
            .gte('started_at', dayStart)
            .lt('started_at', dayEnd);
          if (error) {
            console.warn('[workout] day read failed', error.message);
            return null;
          }
          return data ?? [];
        },
      });
      if (server) lastServer.current = { key, rows: server };

      // Queued edits may move a row to/from this day: filter the merged result by local date.
      const dayRows = rowsForLocalDate(rows, date);
      const routineNameById = await fetchRoutineNames(
        dayRows.map((r) => r.routine_id).filter((x): x is string => !!x),
      ).catch(() => new Map<string, string>());

      if (!cancelled) {
        setWorkouts(dayRows.map((r) => rowToSummary(r, routineNameById)));
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

/**
 * Recent workout history (all dates, newest first), for the training tab and
 * its history screen. Pagination: pass a growing `limit`; `hasMore` says the
 * server may have older rows beyond it.
 */
export function useWorkoutHistory(limit: number = 50): {
  workouts: WorkoutSummary[];
  isLoading: boolean;
  hasMore: boolean;
} {
  const { userId } = useSession();
  return useWorkoutHistoryImpl(userId, limit);
}

/** Internal implementation of `useWorkoutHistory`. */
export function useWorkoutHistoryImpl(
  userId: string | null,
  limit: number = 50,
): { workouts: WorkoutSummary[]; isLoading: boolean; hasMore: boolean } {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const outboxTick = useOutboxTick();
  const lastServer = useRef<{ key: string; rows: WorkoutListRow[] } | null>(
    null,
  );

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const uid = userId;
    const key = uid;

    async function load() {
      setIsLoading(true);
      // limit + 1: the extra row only tells us whether older workouts exist.
      const { rows, server } = await loadMergedWorkouts({
        userId: uid,
        fallback:
          lastServer.current?.key === key ? lastServer.current.rows : null,
        fetchServer: async () => {
          const { data, error } = await supabase
            .from('workouts')
            .select(WORKOUT_COLUMNS)
            .eq('user_id', uid)
            .order('started_at', { ascending: false })
            .limit(limit + 1);
          if (error) {
            console.warn('[workout] history read failed', error.message);
            return null;
          }
          return data ?? [];
        },
      });
      if (server) lastServer.current = { key, rows: server };

      const visible = rows.slice(0, limit);
      const routineNameById = await fetchRoutineNames(
        visible.map((r) => r.routine_id).filter((x): x is string => !!x),
      ).catch(() => new Map<string, string>());

      if (!cancelled) {
        setWorkouts(visible.map((r) => rowToSummary(r, routineNameById)));
        setHasMore(rows.length > limit);
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, limit, outboxTick]);

  if (!userId) return { workouts: [], isLoading: false, hasMore: false };
  return { workouts, isLoading, hasMore };
}
