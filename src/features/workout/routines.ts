/**
 * Routines + their exercises (PLAN §7.4). Writes go through the outbox so
 * creating/editing a routine also works offline; reads use TanStack Query
 * against Supabase.
 */
import * as Crypto from 'expo-crypto';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import {
  enqueueDelete,
  enqueueUpsert,
  pendingDeleteIdsForTable,
  pendingUpsertsForTable,
  subscribeOutbox,
} from '@/lib/outbox';
import { useSession } from '@/features/auth';
import {
  mergeRoutinesWithPending,
  type PendingRoutineExerciseRow,
  type PendingRoutineRow,
} from './routineLogic';
import type { Routine, RoutineExercise } from './types';

export const routinesQueryKey = (userId: string | null) =>
  ['workout', 'routines', userId] as const;

async function fetchRoutines(userId: string): Promise<Routine[]> {
  const [
    { data: routineRows, error: rErr },
    { data: exerciseRows, error: eErr },
  ] = await Promise.all([
    supabase
      .from('routines')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('routine_exercises')
      .select('*, routines!inner(user_id)')
      .eq('routines.user_id', userId)
      .order('order_index', { ascending: true }),
  ]);
  if (rErr) throw rErr;
  if (eErr) throw eErr;

  const exercisesByRoutine = new Map<string, RoutineExercise[]>();
  for (const row of exerciseRows ?? []) {
    const list = exercisesByRoutine.get(row.routine_id) ?? [];
    list.push({
      id: row.id,
      routineId: row.routine_id,
      exerciseId: row.exercise_id,
      orderIndex: row.order_index,
      targetSets: row.target_sets,
      targetReps: row.target_reps,
    });
    exercisesByRoutine.set(row.routine_id, list);
  }

  return (routineRows ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    exercises: exercisesByRoutine.get(r.id) ?? [],
  }));
}

/** Pending (not yet synced) outbox state for routines, overlaid onto server reads. */
function pendingRoutineState() {
  return {
    routines: pendingUpsertsForTable(
      'routines',
    ) as unknown as PendingRoutineRow[],
    routineExercises: pendingUpsertsForTable(
      'routine_exercises',
    ) as unknown as PendingRoutineExerciseRow[],
    deletedRoutineIds: pendingDeleteIdsForTable('routines'),
    deletedExerciseRowIds: pendingDeleteIdsForTable('routine_exercises'),
  };
}

export function useRoutines(): {
  routines: Routine[];
  isLoading: boolean;
  refresh: () => void;
} {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: routinesQueryKey(userId),
    queryFn: () => fetchRoutines(userId as string),
    enabled: !!userId,
  });

  // Re-render when the outbox changes (so unsynced saves/deletes show up
  // immediately) and refetch the server state once routine writes have drained.
  const [outboxVersion, setOutboxVersion] = useState(0);
  useEffect(() => {
    return subscribeOutbox((queue) => {
      setOutboxVersion((v) => v + 1);
      const stillPending = queue.some(
        (e) => e.table === 'routines' || e.table === 'routine_exercises',
      );
      if (!stillPending) {
        void queryClient.invalidateQueries({
          queryKey: routinesQueryKey(userId),
        });
      }
    });
  }, [queryClient, userId]);

  const serverRoutines = query.data;
  const routines = useMemo(() => {
    void outboxVersion; // recompute whenever the outbox changed
    return mergeRoutinesWithPending(
      serverRoutines ?? [],
      pendingRoutineState(),
      userId ?? '',
    );
  }, [serverRoutines, outboxVersion, userId]);

  return {
    routines,
    isLoading: query.isLoading,
    refresh: () => void query.refetch(),
  };
}

export interface RoutineExerciseInput {
  exerciseId: string;
  targetSets: number | null;
  targetReps: number | null;
}

/** Creates or updates a routine's name + full exercise list (order comes from array order). */
export function useSaveRoutine() {
  const { userId } = useSession();
  const queryClient = useQueryClient();

  return async (params: {
    id?: string;
    name: string;
    exercises: RoutineExerciseInput[];
  }): Promise<string> => {
    if (!userId) throw new Error('not signed in');
    const routineId = params.id ?? Crypto.randomUUID();

    enqueueUpsert('routines', routineId, {
      user_id: userId,
      name: params.name,
    });

    // Replace the routine's exercise list: delete the rows we know about
    // (cached server state + still-unsynced outbox rows) then upsert the new
    // set. No network call here, so saving can't hang on a bad connection.
    if (params.id) {
      const known = new Set<string>();
      const cached = queryClient.getQueryData<Routine[]>(
        routinesQueryKey(userId),
      );
      for (const r of cached ?? []) {
        if (r.id !== routineId) continue;
        for (const e of r.exercises) known.add(e.id);
      }
      for (const row of pendingRoutineState().routineExercises) {
        if (row.routine_id === routineId) known.add(row.id);
      }
      for (const rowId of known) enqueueDelete('routine_exercises', rowId);
    }
    params.exercises.forEach((ex, index) => {
      const rowId = Crypto.randomUUID();
      enqueueUpsert('routine_exercises', rowId, {
        routine_id: routineId,
        exercise_id: ex.exerciseId,
        order_index: index,
        target_sets: ex.targetSets,
        target_reps: ex.targetReps,
      });
    });

    void queryClient.invalidateQueries({ queryKey: routinesQueryKey(userId) });
    return routineId;
  };
}

export function useDeleteRoutine() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  return (routineId: string) => {
    // Drop still-unsynced child rows first: otherwise they'd hit an FK error
    // after the routine delete replaced the pending routine upsert, and block
    // the outbox.
    for (const row of pendingRoutineState().routineExercises) {
      if (row.routine_id === routineId) {
        enqueueDelete('routine_exercises', row.id);
      }
    }
    enqueueDelete('routines', routineId);
    void queryClient.invalidateQueries({ queryKey: routinesQueryKey(userId) });
  };
}

export { parseTargetInput } from './routineLogic';
