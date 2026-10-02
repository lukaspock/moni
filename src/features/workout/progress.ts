/**
 * Per-exercise progress (estimated 1RM over time), PLAN §7.4/§7.8, backed by
 * the `v_exercise_progress` view (security_invoker, RLS applies). Values are
 * metric (kg); convert for display only.
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/features/auth';
import { useOutboxTick } from './useOutboxTick';

export interface ProgressPoint {
  /** `YYYY-MM-DD` (Monday of the week, from the DB `date`). */
  weekStart: string;
  estimated1RmKg: number;
  maxWeightKg: number;
  volumeKg: number;
  setCount: number;
}

async function fetchProgress(
  userId: string,
  exerciseId: string,
): Promise<ProgressPoint[]> {
  const { data, error } = await supabase
    .from('v_exercise_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .order('week_start', { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((r) => r.week_start && r.estimated_1rm_kg !== null)
    .map((r) => ({
      weekStart: r.week_start as string,
      estimated1RmKg: Number(r.estimated_1rm_kg),
      maxWeightKg: Number(r.max_weight_kg ?? 0),
      volumeKg: Number(r.volume_kg ?? 0),
      setCount: Number(r.set_count ?? 0),
    }));
}

export function useExerciseProgress(exerciseId: string | null): {
  points: ProgressPoint[];
  isLoading: boolean;
} {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['workout', 'progress', userId, exerciseId],
    queryFn: () => fetchProgress(userId as string, exerciseId as string),
    enabled: !!userId && !!exerciseId,
  });
  // The view reads synced rows only: refetch whenever the outbox changes so a
  // just-finished workout appears as soon as its sets have been uploaded.
  const outboxTick = useOutboxTick(1000);
  useEffect(() => {
    if (outboxTick > 0 && userId && exerciseId)
      void queryClient.invalidateQueries({
        queryKey: ['workout', 'progress', userId, exerciseId],
      });
  }, [outboxTick, userId, exerciseId, queryClient]);
  return { points: query.data ?? [], isLoading: query.isLoading };
}
