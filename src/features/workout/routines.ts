/**
 * Routines + their exercises (PLAN §7.4). Writes go through the outbox so
 * creating/editing a routine also works offline; reads use TanStack Query
 * against Supabase.
 */
import * as Crypto from 'expo-crypto';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { enqueueDelete, enqueueUpsert } from '@/lib/outbox';
import { useSession } from '@/features/auth';
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

export function useRoutines(): {
  routines: Routine[];
  isLoading: boolean;
  refresh: () => void;
} {
  const { userId } = useSession();
  const query = useQuery({
    queryKey: routinesQueryKey(userId),
    queryFn: () => fetchRoutines(userId as string),
    enabled: !!userId,
  });
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

    // Replace the routine's exercise list: delete existing rows we know about, then upsert the new set.
    if (params.id) {
      const { data: existing } = await supabase
        .from('routine_exercises')
        .select('id')
        .eq('routine_id', routineId);
      for (const row of existing ?? []) {
        enqueueDelete('routine_exercises', row.id);
      }
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
    enqueueDelete('routines', routineId);
    void queryClient.invalidateQueries({ queryKey: routinesQueryKey(userId) });
  };
}
