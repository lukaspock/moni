import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { isHealthAvailable } from '../health';
import { supabase } from '../../lib/supabase';
import {
  nextOnboardingStep,
  type OnboardingFlowContext,
  type OnboardingStep,
} from './onboardingFlow';
import { useOnboardingStore } from './onboardingStore';

/** Delay between tapping a single-choice card and advancing — long enough to see the selection. */
export const AUTO_ADVANCE_MS = 380;

export function currentFlowContext(): OnboardingFlowContext {
  return {
    goal: useOnboardingStore.getState().draft.goal,
    healthAvailable: isHealthAvailable(),
  };
}

/**
 * End of the flow: mark the draft final. Signed out → go to sign-up. Signed in
 * (user without profile who was sent back to onboarding) → the gate in
 * `app/_layout.tsx` applies the draft and swaps in (tabs) on its own.
 */
async function finishFlow() {
  useOnboardingStore.getState().finishOnboarding();
  const { data } = await supabase.auth.getSession();
  if (!data.session) router.replace('/(auth)/sign-in');
}

/**
 * `goNext(step)` pushes the next active step (reads the *fresh* store state,
 * so it's safe right after an `update(...)` in the same handler).
 * `advanceSoon(step)` = the same after `AUTO_ADVANCE_MS`, for single-choice
 * screens; repeated taps within the delay only navigate once.
 */
export function useOnboardingNavigation(current: OnboardingStep | 'welcome') {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const goNext = useCallback(
    (opts?: { replace?: boolean }) => {
      const next = nextOnboardingStep(current, currentFlowContext());
      if (!next) {
        void finishFlow();
        return;
      }
      const href = `/(onboarding)/${next}` as Href;
      if (opts?.replace) router.replace(href);
      else router.push(href);
    },
    [current],
  );

  const advanceSoon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      goNext();
    }, AUTO_ADVANCE_MS);
  }, [goNext]);

  return { goNext, advanceSoon };
}
