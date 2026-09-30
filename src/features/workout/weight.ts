/**
 * Latest bodyweight for kcal-burn calculations (PLAN §6.5): reads
 * `weight_logs` directly (owned by the `account` agent, but read-only here).
 * Falls back to null so callers can apply the documented 75kg default.
 */
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/features/auth';

async function fetchLatestWeightKg(userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('weight_logs')
    .select('weight_kg')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.weight_kg ?? null;
}

export function useLatestWeightKg(): {
  weightKg: number | null;
  isLoading: boolean;
} {
  const { userId } = useSession();
  const query = useQuery({
    queryKey: ['workout', 'latestWeight', userId],
    queryFn: () => fetchLatestWeightKg(userId as string),
    enabled: !!userId,
  });
  return { weightKg: query.data ?? null, isLoading: query.isLoading };
}
