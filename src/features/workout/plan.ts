/**
 * Training days by weekday. Since the training cycle (`./trainingCycle.ts`)
 * this is derived from the effective cycle plan of the next 7 days whenever a
 * cycle exists; only users without a cycle still read the legacy
 * `training_plan_days` rows (weekday 0-6, Sun-Sat, matches
 * `src/lib/date.ts#weekdayOf`). Consumers (rhythm rest-day concession, nudges,
 * setup suggestion) only use the weekday set. A row only flags a training day
 * (macros); it never produces a calorie bonus.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { effectivePlanRange } from '@/domain/trainingCycle';
import { supabase } from '@/lib/supabase';
import { toISODate, weekdayOf } from '@/lib/date';
import { useSession } from '@/features/auth';
import { useTrainingCycle } from './trainingCycle';
import type { TrainingPlanDayRow } from './types';

/**
 * `['plannedDay', userId]` on purpose: plan changes invalidate the
 * `['plannedDay']` prefix, which must refresh this.
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

/** Legacy weekday rows (`training_plan_days`), keyed by weekday. Only read without a cycle. */
export function useLegacyWeeklyPlan(enabled: boolean = true): {
  planByWeekday: Map<number, TrainingPlanDayRow>;
  isLoading: boolean;
} {
  const { userId } = useSession();
  const query = useQuery({
    queryKey: planQueryKey(userId),
    queryFn: () => fetchPlan(userId as string),
    enabled: !!userId && enabled,
  });
  const planByWeekday = useMemo(() => {
    const map = new Map<number, TrainingPlanDayRow>();
    for (const row of query.data ?? []) map.set(row.weekday, row);
    return map;
  }, [query.data]);
  return {
    planByWeekday,
    isLoading: !!userId && enabled && query.isLoading,
  };
}

/**
 * The signed-in user's training days keyed by weekday (0-6). With a cycle:
 * the weekdays of the training days among today … today+6 of the effective
 * (shifted) plan; rows are synthesized (`expected_kcal` null).
 */
export function useWeeklyPlan(): {
  planByWeekday: Map<number, TrainingPlanDayRow>;
  isLoading: boolean;
} {
  const { userId } = useSession();
  const { cycle, isLoading: cycleLoading } = useTrainingCycle();
  const legacy = useLegacyWeeklyPlan(!cycleLoading && !cycle);
  const today = toISODate();
  const fromCycle = useMemo(() => {
    if (!cycle || !userId) return null;
    const map = new Map<number, TrainingPlanDayRow>();
    for (const d of effectivePlanRange(
      cycle.slots,
      cycle.anchorDate,
      cycle.shifts,
      today,
      7,
    )) {
      if (d.day.kind !== 'training') continue;
      map.set(weekdayOf(d.date), {
        user_id: userId,
        weekday: weekdayOf(d.date),
        routine_id: d.day.routineId,
        expected_kcal: null,
      });
    }
    return map;
  }, [cycle, userId, today]);
  if (fromCycle) return { planByWeekday: fromCycle, isLoading: false };
  return {
    planByWeekday: legacy.planByWeekday,
    isLoading: cycleLoading || legacy.isLoading,
  };
}
