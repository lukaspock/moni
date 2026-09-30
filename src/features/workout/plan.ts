/**
 * Weekly training plan (`training_plan_days`, PLAN §7.4). weekday 0-6 (Sun-Sat,
 * matches `src/lib/date.ts#weekdayOf`) -> a routine or rest.
 *
 * The onboarding flow (`account` agent) may already have written rows with
 * `routine_id = null` for every weekday, so saving a day always UPSERTs on
 * the table's actual primary key `(user_id, weekday)` rather than inserting.
 */
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/features/auth';
import { estimatePlannedStrengthKcal } from '@/domain/met';
import { useRoutines } from './routines';
import type { TrainingPlanDayRow } from './types';

export const planQueryKey = (userId: string | null) =>
  ['workout', 'plan', userId] as const;

async function fetchPlan(userId: string): Promise<TrainingPlanDayRow[]> {
  const { data, error } = await supabase
    .from('training_plan_days')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

/** All 7 weekday plan rows for the signed-in user, keyed by weekday (0-6). */
export function useWeeklyPlan(): {
  planByWeekday: Map<number, TrainingPlanDayRow>;
  isLoading: boolean;
  refresh: () => void;
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
  return {
    planByWeekday,
    isLoading: query.isLoading,
    refresh: () => void query.refetch(),
  };
}

/** Estimates `expected_kcal` for a routine using a typical-session model (src/domain/met), for display before saving. */
export function estimateExpectedKcalForRoutine(
  totalTargetSets: number,
  latestWeightKg: number | null,
): number {
  const weightKg = latestWeightKg ?? 75; // fallback matches active-workout summary (PLAN §7.4)
  if (totalTargetSets <= 0) return 0;
  return Math.round(estimatePlannedStrengthKcal(totalTargetSets, weightKg));
}

export function useSaveWeekdayPlan() {
  const { userId } = useSession();
  const queryClient = useQueryClient();

  return async (
    weekday: number,
    routineId: string | null,
    expectedKcal: number | null,
  ): Promise<void> => {
    if (!userId) throw new Error('not signed in');
    const { error } = await supabase.from('training_plan_days').upsert(
      {
        user_id: userId,
        weekday,
        routine_id: routineId,
        expected_kcal: expectedKcal,
      },
      { onConflict: 'user_id,weekday' },
    );
    if (error) throw error;
    void queryClient.invalidateQueries({ queryKey: planQueryKey(userId) });
  };
}

/** Convenience: weekly plan joined with routine names, for the training tab's weekly view. */
export function usePlannedDaysWithRoutineNames(): {
  days: {
    weekday: number;
    routineId: string | null;
    routineName: string | null;
    expectedKcal: number | null;
  }[];
  isLoading: boolean;
} {
  const { planByWeekday, isLoading: planLoading } = useWeeklyPlan();
  const { routines, isLoading: routinesLoading } = useRoutines();
  const routineNameById = useMemo(
    () => new Map(routines.map((r) => [r.id, r.name])),
    [routines],
  );

  const days = Array.from({ length: 7 }, (_, weekday) => {
    const row = planByWeekday.get(weekday);
    return {
      weekday,
      routineId: row?.routine_id ?? null,
      routineName: row?.routine_id
        ? (routineNameById.get(row.routine_id) ?? null)
        : null,
      expectedKcal: row?.expected_kcal ?? null,
    };
  });

  return { days, isLoading: planLoading || routinesLoading };
}
