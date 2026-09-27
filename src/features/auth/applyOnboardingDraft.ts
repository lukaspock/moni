import i18n from '../../i18n';
import { estimateDefaultWorkoutExpectedKcal } from '../../domain';
import { toISODate } from '../../lib/date';
import { supabase } from '../../lib/supabase';
import { useOnboardingStore } from './onboardingStore';

/**
 * §7.1 last step: "Answers are held in MMKV until sign-up, then written to
 * `profiles`". Called once, right after the first successful sign-in/sign-up.
 * Idempotent: guarded by the store's `appliedToProfile` flag, and the writes
 * themselves are upserts (or existence-checked inserts) so a retry after a
 * crash/offline gap never duplicates rows.
 */
export async function applyOnboardingDraftToProfile(userId: string): Promise<void> {
  const { draft, appliedToProfile, markAppliedToProfile } = useOnboardingStore.getState();
  if (appliedToProfile) return;

  // Defensive: the onboarding flow enforces these before the result screen,
  // but don't write a half-complete profile if it somehow gets here early.
  if (!draft.sex || !draft.birthDate || !draft.heightCm || !draft.weightKg || !draft.activityLevel || !draft.goal) {
    return;
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    sex: draft.sex,
    birth_date: draft.birthDate,
    height_cm: draft.heightCm,
    activity_level: draft.activityLevel,
    goal: draft.goal,
    goal_rate_kg_per_week: draft.goalRateKgPerWeek,
    workouts_per_week: draft.workoutsPerWeek,
    unit_system: draft.unitSystem,
    locale: i18n.language,
    eat_back_factor: draft.eatBackFactor,
  });
  if (profileError) throw profileError;

  const weekdays = draft.trainingWeekdays;
  if (weekdays.length > 0) {
    const expectedKcal = estimateDefaultWorkoutExpectedKcal(draft.weightKg);
    const rows = weekdays.map((weekday) => ({
      user_id: userId,
      weekday,
      routine_id: null,
      expected_kcal: expectedKcal,
    }));
    const { error: planError } = await supabase
      .from('training_plan_days')
      .upsert(rows, { onConflict: 'user_id,weekday' });
    if (planError) throw planError;
  }

  // Drop any previously-chosen weekdays that are no longer selected (re-running onboarding).
  const weekdayList = weekdays.length > 0 ? weekdays.join(',') : '-1';
  const { error: cleanupError } = await supabase
    .from('training_plan_days')
    .delete()
    .eq('user_id', userId)
    .not('weekday', 'in', `(${weekdayList})`);
  if (cleanupError) throw cleanupError;

  const today = toISODate();
  const { data: existingWeightLog, error: existingWeightError } = await supabase
    .from('weight_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  if (existingWeightError) throw existingWeightError;

  if (!existingWeightLog) {
    const { error: weightError } = await supabase.from('weight_logs').insert({
      user_id: userId,
      date: today,
      weight_kg: draft.weightKg,
      source: 'manual',
    });
    if (weightError) throw weightError;
  }

  markAppliedToProfile();
}
