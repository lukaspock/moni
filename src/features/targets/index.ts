// CONTRACT (owner: `account` agent). Signatures are fixed, implementation is replaced.
import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  ageFromBirthDate,
  calculateBMR,
  calculateBaseTDEE,
  calculateBaseTarget,
  calculateMacros,
  calculateWorkoutBonus,
  type ActivityLevel,
  type Sex,
} from '@/domain';
import { useSession } from '@/features/auth';
import { usePlannedDay, useWorkoutsForDate } from '@/features/workout';
import { toISODate } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export type DailyTargets = {
  date: string; // YYYY-MM-DD
  baseKcal: number;
  workoutBonusKcal: number;
  /** true = bonus comes from the plan (shown dashed), not yet from a real workout */
  bonusIsProvisional: boolean;
  totalKcal: number; // baseKcal + workoutBonusKcal
  proteinG: number;
  carbsG: number;
  fatG: number;
  isTrainingDay: boolean;
};

/**
 * Signed-in user's profile, or null while loading / before onboarding.
 * `isError` = the fetch failed (e.g. offline) — "unknown", not "no profile".
 */
export function useProfile(): { profile: Profile | null; isLoading: boolean; isError: boolean } {
  const { userId } = useSession();

  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    // The auth gate waits on this query: fail fast (1 retry, ~0.8 s) instead of
    // TanStack's default 3 retries with backoff (~7 s blank screen when offline).
    retry: 1,
    retryDelay: 800,
  });

  return { profile: query.data ?? null, isLoading: !!userId && query.isLoading, isError: query.isError };
}

/** Most recent `weight_logs` entry at or before `date`, or null if none yet. */
function useLatestWeightKg(userId: string | null, date: string) {
  return useQuery({
    queryKey: ['latestWeight', userId, date],
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('weight_kg')
        .eq('user_id', userId!)
        .lte('date', date)
        .order('date', { ascending: false })
        // several rows per day are legit (Health scale + manual) → newest wins
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.weight_kg ?? null;
    },
    enabled: !!userId,
  });
}

/**
 * Logs today's manual weight. There is intentionally no unique `(user_id, date)`
 * constraint (Apple Health can import several weights per day), so this
 * updates the user's existing *manual* row for `date` if there is one and
 * inserts otherwise. `created_at` is bumped so the value counts as the latest.
 */
export async function logManualWeight(userId: string, weightKg: number, date: string = toISODate()): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from('weight_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('source', 'manual')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (selectError) throw selectError;

  const now = new Date().toISOString();
  const { error } = existing
    ? await supabase.from('weight_logs').update({ weight_kg: weightKg, created_at: now }).eq('id', existing.id)
    : await supabase.from('weight_logs').insert({ user_id: userId, date, weight_kg: weightKg, source: 'manual' });
  if (error) throw error;
}

/**
 * Best-effort cache of the computed target into `daily_targets` (only for
 * today, only when the inputs actually changed) — cheap enough to do inline;
 * see PLAN §5 `daily_targets`. This is a read-through cache for other
 * screens/Insights, not the source of truth (that's this hook's own
 * computation from src/domain).
 */
function useUpsertDailyTargets(userId: string | null, date: string, targets: DailyTargets | null, tdeeUsed: number | null) {
  const lastWrittenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !targets) return;
    const signature = JSON.stringify({ userId, date, targets, tdeeUsed });
    if (lastWrittenRef.current === signature) return;
    lastWrittenRef.current = signature;

    void supabase
      .from('daily_targets')
      .upsert(
        {
          user_id: userId,
          date,
          base_kcal: targets.baseKcal,
          workout_bonus_kcal: targets.workoutBonusKcal,
          protein_g: targets.proteinG,
          carbs_g: targets.carbsG,
          fat_g: targets.fatG,
          tdee_used: tdeeUsed,
          is_training_day: targets.isTrainingDay,
          computed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' },
      )
      .then(({ error }) => {
        if (error) {
          // Non-fatal: the UI already has the freshly computed value from src/domain.
          lastWrittenRef.current = null;
          console.warn('[targets] failed to cache daily_targets', error.message);
        }
      });
  }, [userId, date, targets, tdeeUsed]);
}

/** Dynamic daily limit for a date (PLAN §6.4), computed via src/domain. */
export function useDailyTargets(date: string): {
  targets: DailyTargets | null;
  isLoading: boolean;
} {
  const { userId } = useSession();
  const { profile, isLoading: profileLoading } = useProfile();
  const { plannedDay, isLoading: plannedLoading } = usePlannedDay(date);
  const { workouts, isLoading: workoutsLoading } = useWorkoutsForDate(date);
  const weightQuery = useLatestWeightKg(userId, date);

  const isLoading = profileLoading || plannedLoading || workoutsLoading || (!!userId && weightQuery.isLoading);

  const computed = useMemo((): { targets: DailyTargets; tdeeUsed: number } | null => {
    if (
      !profile ||
      !profile.sex ||
      !profile.birth_date ||
      !profile.height_cm ||
      !profile.activity_level ||
      !profile.goal ||
      profile.goal_rate_kg_per_week == null
    ) {
      return null;
    }
    const weightKg = weightQuery.data;
    if (!weightKg) return null; // no weight logged yet — nothing to compute macros/BMR against

    const age = ageFromBirthDate(new Date(profile.birth_date));
    const bmr = calculateBMR(profile.sex as Sex, weightKg, profile.height_cm, age);
    const tdee = calculateBaseTDEE(bmr, profile.activity_level as ActivityLevel);
    const base = calculateBaseTarget({
      tdee,
      sex: profile.sex as Sex,
      goalRateKgPerWeek: profile.goal_rate_kg_per_week,
    });

    const isTrainingDay = !!plannedDay;
    const completedWorkouts = workouts.filter((w) => w.endedAt != null);
    const workoutCompleted = completedWorkouts.length > 0;
    const actualKcalBurned = completedWorkouts.reduce((sum, w) => sum + (w.kcalBurned ?? 0), 0);
    const isDayOver = date < toISODate();

    const bonus = calculateWorkoutBonus({
      baseKcal: base.baseKcal,
      isTrainingDay,
      plannedExpectedKcal: plannedDay?.expectedKcal,
      workoutCompleted,
      actualKcalBurned: workoutCompleted ? actualKcalBurned : undefined,
      isDayOver,
      eatBackFactor: profile.eat_back_factor,
    });

    const macros = calculateMacros({
      totalKcal: bonus.dailyLimitKcal,
      weightKg,
      isStrengthDay: isTrainingDay,
      isDeficit: profile.goal === 'lose',
    });

    return {
      tdeeUsed: Math.round(tdee),
      targets: {
        date,
        baseKcal: base.baseKcal,
        workoutBonusKcal: bonus.workoutBonusKcal,
        bonusIsProvisional: bonus.isProvisional,
        totalKcal: bonus.dailyLimitKcal,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
        isTrainingDay,
      },
    };
  }, [profile, plannedDay, workouts, weightQuery.data, date]);

  useUpsertDailyTargets(userId, date, computed?.targets ?? null, computed?.tdeeUsed ?? null);

  return { targets: computed?.targets ?? null, isLoading };
}
