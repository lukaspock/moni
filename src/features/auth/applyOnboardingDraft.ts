import i18n from '../../i18n';
import { estimateDefaultWorkoutExpectedKcal } from '../../domain';
import { toISODate } from '../../lib/date';
import { supabase } from '../../lib/supabase';
import { isDraftComplete, useOnboardingStore } from './onboardingStore';
import { isProfileComplete } from './profileStatus';

export type ApplyDraftResult =
  /** draft written to profiles/training_plan_days/weight_logs */
  | 'applied'
  /** the account already had a complete profile — left untouched (existing user signed in) */
  | 'skippedExisting'
  /** nothing to write (draft already applied, or incomplete) */
  | 'nothingToApply';

let inFlight: Promise<ApplyDraftResult> | null = null;

/**
 * §7.1 last step: "Answers are held in MMKV until sign-up, then written to
 * `profiles`". Called by the auth gate (`app/_layout.tsx`) once a session
 * exists and the finished draft hasn't been applied yet.
 *
 * - Never overwrites an existing, complete server-side profile (an existing
 *   user who ran through onboarding on this device and then signed in).
 * - Idempotent: guarded by the store's `appliedToProfile` flag, concurrent
 *   calls share one in-flight promise, and the writes are upserts (or
 *   existence-checked inserts), so a retry after a crash never duplicates rows.
 */
export function applyOnboardingDraftToProfile(userId: string): Promise<ApplyDraftResult> {
  if (!inFlight) {
    inFlight = applyImpl(userId).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function applyImpl(userId: string): Promise<ApplyDraftResult> {
  const { draft, appliedToProfile, markAppliedToProfile } = useOnboardingStore.getState();
  if (appliedToProfile || !isDraftComplete(draft)) return 'nothingToApply';

  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (isProfileComplete(existing)) {
    markAppliedToProfile();
    return 'skippedExisting';
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    display_name: draft.displayName.trim() ? draft.displayName.trim().slice(0, 40) : null,
    motivation: draft.motivation,
    sex: draft.sex,
    birth_date: draft.birthDate,
    height_cm: draft.heightCm,
    activity_level: draft.activityLevel,
    goal: draft.goal,
    goal_rate_kg_per_week: draft.goal === 'maintain' ? 0 : draft.goalRateKgPerWeek,
    target_weight_kg: draft.goal === 'maintain' ? null : draft.targetWeightKg,
    training_experience: draft.trainingExperience,
    workouts_per_week: draft.workoutsPerWeek,
    diet: draft.diet,
    health_disclaimer_accepted_at: draft.disclaimerAcceptedAt,
    unit_system: draft.unitSystem,
    locale: i18n.language,
    eat_back_factor: draft.eatBackFactor,
  });
  if (profileError) throw profileError;

  const weekdays = draft.trainingWeekdays;
  if (weekdays.length > 0) {
    const expectedKcal = estimateDefaultWorkoutExpectedKcal(draft.weightKg!);
    const rows = weekdays.map((weekday) => ({
      user_id: userId,
      weekday,
      routine_id: null,
      expected_kcal: expectedKcal,
    }));
    const { error: planError } = await supabase.from('training_plan_days').upsert(rows, { onConflict: 'user_id,weekday' });
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
    .limit(1)
    .maybeSingle();
  if (existingWeightError) throw existingWeightError;

  if (!existingWeightLog) {
    const { error: weightError } = await supabase.from('weight_logs').insert({
      user_id: userId,
      date: today,
      weight_kg: draft.weightKg!,
      source: 'manual',
    });
    if (weightError) throw weightError;
  }

  markAppliedToProfile();
  return 'applied';
}
