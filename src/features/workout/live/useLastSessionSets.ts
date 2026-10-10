/**
 * "Last time" values for the live session's pre-fill (docs/identity/06 §5):
 * the sets of the most recent finished session per exercise. Server rows
 * (`workout_sets`, RLS via the parent workout) + outbox overlay (a session
 * finished offline is still queued), picked by the pure
 * `pickLastSessionSets`. While loading or offline, the device-local cache
 * written by `finishActiveWorkout` (`getPreviousSetValues`) is used.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { pendingDeleteIdsForTable, pendingUpsertsForTable } from '@/lib/outbox';
import { useSession } from '@/features/auth';
import {
  pickLastSessionSets,
  type LastSetRow,
  type PrefillValues,
} from '@/domain/workoutPrefill';
import { getPreviousSetValues } from '../finish';

/** Enough rows to cover the last session of an exercise, even with many sets. */
const ROWS_PER_EXERCISE = 30;

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);

function pendingRows(): LastSetRow[] {
  return pendingUpsertsForTable('workout_sets')
    .filter(
      (p) => typeof p.exercise_id === 'string' && typeof p.id === 'string',
    )
    .map((p) => ({
      id: p.id as string,
      workoutId: p.workout_id as string,
      exerciseId: p.exercise_id as string,
      setIndex: Number(p.set_index ?? 0),
      completedAt: (p.completed_at as string | null) ?? null,
      reps: num(p.reps),
      weightKg: num(p.weight_kg),
      durationS: num(p.duration_s),
      distanceM: num(p.distance_m),
    }));
}

async function fetchLastSets(
  exerciseIds: string[],
  excludeWorkoutId: string | null,
): Promise<Record<string, PrefillValues[]>> {
  const server = await Promise.all(
    exerciseIds.map(async (exerciseId) => {
      const { data, error } = await supabase
        .from('workout_sets')
        .select(
          'id, workout_id, exercise_id, set_index, completed_at, reps, weight_kg, duration_s, distance_m',
        )
        .eq('exercise_id', exerciseId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(ROWS_PER_EXERCISE);
      if (error) throw error;
      return (data ?? []).map((r): LastSetRow => ({
        id: r.id,
        workoutId: r.workout_id,
        exerciseId: r.exercise_id,
        setIndex: r.set_index,
        completedAt: r.completed_at,
        reps: r.reps,
        weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
        durationS: r.duration_s,
        distanceM: r.distance_m === null ? null : Number(r.distance_m),
      }));
    }),
  );
  const rows = [...server.flat(), ...pendingRows()];
  const opts = {
    excludeWorkoutId,
    deletedWorkoutIds: pendingDeleteIdsForTable('workouts'),
    deletedSetIds: pendingDeleteIdsForTable('workout_sets'),
  };
  const out: Record<string, PrefillValues[]> = {};
  for (const id of exerciseIds) {
    out[id] = pickLastSessionSets(rows, id, opts);
  }
  return out;
}

/**
 * Last session's sets per exercise id (metric). Missing exercise = never
 * trained (or not loaded yet and not in the local cache).
 */
export function useLastSessionSets(
  exerciseIds: string[],
  currentWorkoutId: string | null,
): Record<string, PrefillValues[]> {
  const { userId } = useSession();
  const sortedKey = useMemo(
    () => [...new Set(exerciseIds)].sort().join(','),
    [exerciseIds],
  );
  const query = useQuery({
    queryKey: ['workout', 'lastSets', userId, currentWorkoutId, sortedKey],
    queryFn: () =>
      fetchLastSets(sortedKey ? sortedKey.split(',') : [], currentWorkoutId),
    enabled: !!userId && sortedKey.length > 0,
    staleTime: 5 * 60_000,
    // Swapping/adding an exercise changes the key: keep the old answer meanwhile.
    placeholderData: (prev) => prev,
  });

  return useMemo(() => {
    const ids = sortedKey ? sortedKey.split(',') : [];
    const out: Record<string, PrefillValues[]> = {};
    for (const id of ids) {
      const fromServer = query.data?.[id];
      if (fromServer && fromServer.length > 0) {
        out[id] = fromServer;
        continue;
      }
      const cached = getPreviousSetValues(id);
      if (cached.length > 0) out[id] = cached;
    }
    return out;
  }, [sortedKey, query.data]);
}
