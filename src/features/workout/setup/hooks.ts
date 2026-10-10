/**
 * Hooks + navigation helpers of the training setup flow. Kept out of the
 * workout barrel on purpose: `useProfile` comes from the targets feature,
 * which itself imports the workout barrel (import cycle).
 */
import { useCallback, useEffect, useRef } from 'react';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { clampDaysPerWeek } from '@/domain/routineTemplates';
import { useProfile } from '@/features/targets';
import { useWeeklyPlan } from '../plan';
import { useSaveRoutine } from '../routines';
import { useTrainingSetupStore, type SetupRoutine } from './setupStore';

/** Weekly frequency to preselect: onboarding answer, else the number of plan days, else null. */
export function useSuggestedDaysPerWeek(): number | null {
  const { profile } = useProfile();
  const { planByWeekday } = useWeeklyPlan();
  if (profile?.workouts_per_week) {
    return clampDaysPerWeek(profile.workouts_per_week);
  }
  if (planByWeekday.size > 0) return clampDaysPerWeek(planByWeekday.size);
  return null;
}

/** Display name of a draft routine: the user's name, else the translated template name. */
export function useSetupRoutineName(): (routine: SetupRoutine) => string {
  const { t } = useTranslation();
  return useCallback(
    (routine: SetupRoutine) => {
      const custom = routine.name?.trim();
      if (custom) return custom;
      if (routine.nameKey) return t(routine.nameKey);
      return t('trainingSetup.proposal.untitled');
    },
    [t],
  );
}

/**
 * Saves every non-empty draft routine through `useSaveRoutine`, one after the
 * other (outbox → works offline). Resolves with the number of saved routines.
 */
export function useSaveTrainingSetup(): () => Promise<number> {
  const saveRoutine = useSaveRoutine();
  const routineName = useSetupRoutineName();
  return async () => {
    const { routines } = useTrainingSetupStore.getState();
    let saved = 0;
    for (const routine of routines) {
      if (routine.exercises.length === 0) continue;
      await saveRoutine({
        name: routineName(routine),
        exercises: routine.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          targetSets: ex.sets,
          targetReps: ex.reps,
          // target_reps holds the top of the range, target_reps_min the template's lower bound (e.g. 8–10).
          targetRepsMin:
            ex.repsMin != null && ex.reps != null && ex.repsMin < ex.reps
              ? ex.repsMin
              : null,
        })),
      });
      saved += 1;
    }
    return saved;
  };
}

/** Closes the whole setup modal and lands on the Training tab. */
export function closeTrainingSetup(): void {
  router.dismissTo('/(tabs)/training');
}

/** Resets the draft and opens the setup flow (fullScreenModal). */
export function openTrainingSetup(): void {
  useTrainingSetupStore.getState().start();
  router.push('/training-setup' as Href);
}

/** Same beat as onboarding: long enough to see the selection, short enough to feel instant. */
export const SETUP_AUTO_ADVANCE_MS = 380;

/**
 * Single-choice auto-advance: `advance(href)` pushes after
 * `SETUP_AUTO_ADVANCE_MS`; repeated taps within the delay navigate once.
 */
export function useAdvanceSoon(): (href: Href) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return useCallback((href: Href) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      router.push(href);
    }, SETUP_AUTO_ADVANCE_MS);
  }, []);
}
