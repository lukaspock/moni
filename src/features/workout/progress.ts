/**
 * Per-exercise progress (estimated 1RM over time), PLAN §7.4/§7.8, backed by
 * the `v_exercise_progress` view (security_invoker, RLS applies).
 */
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/features/auth';

export interface ProgressPoint {
  weekStart: string;
  estimated1RmKg: number;
  maxWeightKg: number;
  volumeKg: number;
  setCount: number;
}

async function fetchProgress(userId: string, exerciseId: string): Promise<ProgressPoint[]> {
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
      estimated1RmKg: r.estimated_1rm_kg as number,
      maxWeightKg: (r.max_weight_kg as number) ?? 0,
      volumeKg: (r.volume_kg as number) ?? 0,
      setCount: (r.set_count as number) ?? 0,
    }));
}

export function useExerciseProgress(exerciseId: string | null): { points: ProgressPoint[]; isLoading: boolean } {
  const { userId } = useSession();
  const query = useQuery({
    queryKey: ['workout', 'progress', userId, exerciseId],
    queryFn: () => fetchProgress(userId as string, exerciseId as string),
    enabled: !!userId && !!exerciseId,
  });
  return { points: query.data ?? [], isLoading: query.isLoading };
}
