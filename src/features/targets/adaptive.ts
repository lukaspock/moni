import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { isRecomputeDue } from '@/domain/recomputeSchedule';
import { useSession } from '@/features/auth';
import { toISODate } from '@/lib/date';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export type AdaptiveReason =
  | 'observed_higher_than_formula'
  | 'observed_lower_than_formula'
  | 'aligned_with_formula'
  | 'clamped_by_weekly_limit';

/** Latest server-side adaptive TDEE estimate (PLAN §6.7), see `recompute-targets`. */
export type AdaptiveTdeeEstimate = {
  weekStart: string; // YYYY-MM-DD (Monday)
  formulaTdee: number;
  observedTdee: number | null;
  /** the TDEE the daily limit is based on once an estimate exists */
  blendedTdee: number;
  confidence: number; // 0..1
  reasonCode: AdaptiveReason | null;
  /** blended minus previous value, kcal/day (signed) */
  weeklyChangeKcal: number;
  weightTrendKg: number | null;
  createdAt: string;
};

/** Newest `tdee_estimates` row, or null while there is not enough data yet. */
export function useAdaptiveTdee(): {
  estimate: AdaptiveTdeeEstimate | null;
  isLoading: boolean;
} {
  const { userId } = useSession();
  const query = useQuery({
    queryKey: ['targets', 'adaptiveTdee', userId],
    queryFn: async (): Promise<AdaptiveTdeeEstimate | null> => {
      const { data, error } = await supabase
        .from('tdee_estimates')
        .select('*')
        .eq('user_id', userId!)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.blended_tdee == null) return null;
      return {
        weekStart: data.week_start,
        formulaTdee: Number(data.formula_tdee ?? data.blended_tdee),
        observedTdee:
          data.observed_tdee == null ? null : Number(data.observed_tdee),
        blendedTdee: Number(data.blended_tdee),
        confidence: Number(data.confidence ?? 0),
        reasonCode: (data.reason_code as AdaptiveReason | null) ?? null,
        weeklyChangeKcal: Number(data.weekly_change_kcal ?? 0),
        weightTrendKg:
          data.weight_trend_kg == null ? null : Number(data.weight_trend_kg),
        createdAt: data.created_at,
      };
    },
    enabled: !!userId,
  });
  return {
    estimate: query.data ?? null,
    isLoading: !!userId && query.isLoading,
  };
}

const attemptKey = (userId: string) => `targets:recomputeAttempt:${userId}`;
let inFlight = false;

/**
 * Calls the `recompute-targets` Edge Function for the signed-in user when the last attempt is
 * older than 7 days (local MMKV timestamp). Fire-and-forget; safe to mount in several places
 * (module-level in-flight guard + timestamp). The attempt is recorded before the call so an
 * offline/failed run doesn't retry on every screen mount; a failed call clears it again.
 */
export function useRecomputeTargetsIfDue(): void {
  const { userId } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || inFlight) return;
    const last = storage.getNumber(attemptKey(userId));
    if (!isRecomputeDue(last, Date.now())) return;

    inFlight = true;
    const previous = last;
    storage.set(attemptKey(userId), Date.now());
    void supabase.functions
      .invoke('recompute-targets', { body: { today: toISODate() } })
      .then(({ error }) => {
        if (error) throw error;
        void queryClient.invalidateQueries({ queryKey: ['targets'] });
      })
      .catch((e: unknown) => {
        // allow a retry on the next launch
        if (previous == null) storage.remove(attemptKey(userId));
        else storage.set(attemptKey(userId), previous);
        console.warn(
          '[targets] recompute-targets failed',
          e instanceof Error ? e.message : e,
        );
      })
      .finally(() => {
        inFlight = false;
      });
  }, [userId, queryClient]);
}
