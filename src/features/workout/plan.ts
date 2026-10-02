/**
 * Training weekdays (`training_plan_days`, PLAN §7.4), read-only. weekday 0-6
 * (Sun-Sat, matches `src/lib/date.ts#weekdayOf`). Rows are written by the
 * onboarding flow and by the weekday toggles in the profile; there is no plan
 * editor in the Training tab anymore. A row only flags a day as a training day
 * (macros); it never produces a calorie bonus.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/features/auth';
import type { TrainingPlanDayRow } from './types';

/**
 * `['plannedDay', userId]` on purpose: the profile screen invalidates the
 * `['plannedDay']` prefix after toggling a weekday, which must refresh this.
 */
export const planQueryKey = (userId: string | null) =>
  ['plannedDay', userId] as const;

async function fetchPlan(userId: string): Promise<TrainingPlanDayRow[]> {
  const { data, error } = await supabase
    .from('training_plan_days')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

/** The signed-in user's training-day rows, keyed by weekday (0-6). */
export function useWeeklyPlan(): {
  planByWeekday: Map<number, TrainingPlanDayRow>;
  isLoading: boolean;
} {
  const { userId } = useSession();
  const query = useQuery({
    queryKey: planQueryKey(userId),
    queryFn: () => fetchPlan(userId as string),
    enabled: !!userId,
  });
  const planByWeekday = useMemo(() => {
    const map = new Map<number, TrainingPlanDayRow>();
    for (const row of query.data ?? []) map.set(row.weekday, row);
    return map;
  }, [query.data]);
  return { planByWeekday, isLoading: !!userId && query.isLoading };
}
