import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { shiftIsoDate, type DaySummary } from '@/domain';
import { useSession } from '@/features/auth';
import { supabase } from '@/lib/supabase';

/** Days of history loaded for the Insights cards (covers 30-day views + correlation weeks). */
export const SUMMARY_DAYS = 60;

/** Per-day kcal / protein / training summary from `v_daily_summary` (RLS via security_invoker). */
export function useDailySummaries(today: string): { days: DaySummary[]; isLoading: boolean } {
  const { userId } = useSession();
  const from = shiftIsoDate(today, -(SUMMARY_DAYS - 1));
  const query = useQuery({
    queryKey: ['insights', 'dailySummary', userId, today],
    queryFn: async (): Promise<DaySummary[]> => {
      const { data, error } = await supabase
        .from('v_daily_summary')
        .select('date,kcal_eaten,target_kcal,protein_eaten,target_protein_g,food_log_count,had_workout')
        .eq('user_id', userId!)
        .gte('date', from)
        .lte('date', today)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter((r) => r.date)
        .map((r) => ({
          date: r.date as string,
          kcalEaten: r.kcal_eaten ?? 0,
          targetKcal: r.target_kcal,
          proteinEatenG: r.protein_eaten ?? 0,
          targetProteinG: r.target_protein_g,
          logged: (r.food_log_count ?? 0) > 0,
          hadWorkout: r.had_workout ?? false,
        }));
    },
    enabled: !!userId,
  });
  const days = useMemo(() => query.data ?? [], [query.data]);
  return { days, isLoading: !!userId && query.isLoading };
}

export interface ExerciseTrend {
  exerciseId: string;
  firstOneRmKg: number;
  latestOneRmKg: number;
  weeks: number;
  /** estimated 1RM per week, oldest first */
  series: number[];
}

/** Top exercises by logged sets in the last 12 weeks, with their est. 1RM trend (`v_exercise_progress`). */
export function useExerciseTrends(today: string, limit = 3): { trends: ExerciseTrend[]; isLoading: boolean } {
  const { userId } = useSession();
  const from = shiftIsoDate(today, -84);
  const query = useQuery({
    queryKey: ['insights', 'exerciseTrends', userId, from],
    queryFn: async (): Promise<ExerciseTrend[]> => {
      const { data, error } = await supabase
        .from('v_exercise_progress')
        .select('exercise_id,week_start,estimated_1rm_kg,set_count')
        .eq('user_id', userId!)
        .gte('week_start', from)
        .order('week_start', { ascending: true });
      if (error) throw error;
      const byExercise = new Map<string, { series: number[]; sets: number }>();
      for (const r of data ?? []) {
        if (!r.exercise_id || r.estimated_1rm_kg === null) continue;
        const e = byExercise.get(r.exercise_id) ?? { series: [], sets: 0 };
        e.series.push(r.estimated_1rm_kg);
        e.sets += r.set_count ?? 0;
        byExercise.set(r.exercise_id, e);
      }
      return [...byExercise.entries()]
        .filter(([, e]) => e.series.length >= 2)
        .sort(([, a], [, b]) => b.sets - a.sets)
        .slice(0, limit)
        .map(([exerciseId, e]) => ({
          exerciseId,
          firstOneRmKg: e.series[0],
          latestOneRmKg: e.series[e.series.length - 1],
          weeks: e.series.length,
          series: e.series,
        }));
    },
    enabled: !!userId,
  });
  return { trends: query.data ?? [], isLoading: !!userId && query.isLoading };
}
