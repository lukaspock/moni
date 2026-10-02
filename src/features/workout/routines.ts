/**
 * Routines + their exercises (PLAN §7.4). Writes go through the outbox so
 * creating/editing a routine also works offline; reads use TanStack Query
 * against Supabase with the queued outbox changes overlaid.
 */
import { useEffect } from 'react';
import * as Crypto from 'expo-crypto';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import {
  enqueueDelete,
  enqueueUpsert,
  pendingDeleteIdsForTable,
  pendingUpsertsForTable,
} from '@/lib/outbox';
import { useSession } from '@/features/auth';
import { overlayRoutines } from './routinesMerge';
import type { Routine, RoutineExercise } from './types';
import { useOutboxTick } from './useOutboxTick';

export const routinesQueryKey = (userId: string | null) =>
  ['workout', 'routines', userId] as const;

const routinesCacheKey = (userId: string) => `workout:routinesCache:${userId}`;

function readRoutinesCache(userId: string): Routine[] {
  const raw = storage.getString(routinesCacheKey(userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Routine[];
  } catch {
    return [];
  }
}

async function fetchRoutinesFromServer(userId: string): Promise<Routine[]> {
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

/**
 * Routines as the user sees them: the last server state (live, or the MMKV
 * copy of the last successful read when offline) with queued outbox changes
 * overlaid — so a delete/edit/create shows up immediately and also offline.
 */
async function fetchRoutines(userId: string): Promise<Routine[]> {
  let server: Routine[];
  try {
    server = await fetchRoutinesFromServer(userId);
    storage.set(routinesCacheKey(userId), JSON.stringify(server));
  } catch (err) {
    console.warn('[workout] routines read failed, using cached copy', err);
    server = readRoutinesCache(userId);
  }
  return overlayRoutines({
    server,
    userId,
    routineUpserts: pendingUpsertsForTable('routines'),
    routineDeleteIds: pendingDeleteIdsForTable('routines'),
    exerciseUpserts: pendingUpsertsForTable('routine_exercises'),
    exerciseDeleteIds: pendingDeleteIdsForTable('routine_exercises'),
  });
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
  // Re-read whenever the outbox changes (queued, merged, synced): both the overlay and the
  // server state move, and a finished sync must swap local rows for the server's.
  const outboxTick = useOutboxTick();
  useEffect(() => {
    if (outboxTick > 0 && userId)
      void queryClient.invalidateQueries({
        queryKey: routinesQueryKey(userId),
      });
  }, [outboxTick, userId, queryClient]);
  return {
    routines: query.data ?? [],
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

    // Replace the routine's exercise list: delete every row we know about, then upsert the new set.
    // Known = server rows (when reachable) + the list currently shown (covers offline) + rows still
    // pending in the outbox (never synced). A delete for a never-synced row simply replaces its
    // queued upsert, so editing twice offline can't duplicate exercises.
    if (params.id) {
      const oldIds = new Set<string>();
      const shown = queryClient
        .getQueryData<Routine[]>(routinesQueryKey(userId))
        ?.find((r) => r.id === routineId);
      for (const e of shown?.exercises ?? []) oldIds.add(e.id);
      for (const p of pendingUpsertsForTable('routine_exercises')) {
        if (p.routine_id === routineId) oldIds.add(p.id as string);
      }
      // Offline the request can hang for a long time; don't make "Save" wait for it.
      const existing = await Promise.race([
        supabase
          .from('routine_exercises')
          .select('id')
          .eq('routine_id', routineId)
          .then(({ data }) => data ?? []),
        new Promise<{ id: string }[]>((resolve) =>
          setTimeout(() => resolve([]), 3000),
        ),
      ]).catch(() => [] as { id: string }[]);
      for (const row of existing) oldIds.add(row.id);
      for (const id of oldIds) enqueueDelete('routine_exercises', id);
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
    // The outbox cascades: pending routine_exercises of this routine are dropped and pending
    // workouts referencing it are detached, so nothing violates a foreign key later.
    enqueueDelete('routines', routineId);
    void queryClient.invalidateQueries({ queryKey: routinesQueryKey(userId) });
  };
}

export { parseTargetInput } from './routineLogic';
