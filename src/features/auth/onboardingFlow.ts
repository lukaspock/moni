import type { Goal } from '../../domain/types';

/**
 * Onboarding v2 step order (single source of truth for "what comes next" and
 * the progress bar). Pure — no RN imports — so it's unit-testable.
 *
 * Deviation from the brief's proposed order: `activity` moved *before* `goal`,
 * so that by the time the user picks a target weight and pace every input of
 * the calorie formula is known and those screens can show real, live numbers
 * (kcal/day, projected goal date) instead of placeholders.
 */
export const ONBOARDING_STEPS = [
  'name',
  'motivation',
  'sex',
  'birth-date',
  'body',
  'activity',
  'goal',
  'target-weight',
  'rate',
  'experience',
  'schedule',
  'diet',
  'disclaimer',
  'calculating',
  'result',
  'health',
  'notifications',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingFlowContext = {
  goal: Goal | null;
  /** HealthKit usable on this device (health primer is skipped otherwise) */
  healthAvailable: boolean;
};

export function isStepActive(step: OnboardingStep, ctx: OnboardingFlowContext): boolean {
  if (step === 'target-weight' || step === 'rate') return ctx.goal !== 'maintain';
  if (step === 'health') return ctx.healthAvailable;
  return true;
}

export function activeSteps(ctx: OnboardingFlowContext): OnboardingStep[] {
  return ONBOARDING_STEPS.filter((s) => isStepActive(s, ctx));
}

/** Next step after `current` ('welcome' = the intro screen); null = flow finished → sign-up. */
export function nextOnboardingStep(current: OnboardingStep | 'welcome', ctx: OnboardingFlowContext): OnboardingStep | null {
  const start = current === 'welcome' ? 0 : ONBOARDING_STEPS.indexOf(current) + 1;
  for (let i = start; i < ONBOARDING_STEPS.length; i += 1) {
    if (isStepActive(ONBOARDING_STEPS[i], ctx)) return ONBOARDING_STEPS[i];
  }
  return null;
}

/** 0..1 progress for the top bar (step n of N, counting only active steps). */
export function onboardingProgress(step: string | null, ctx: OnboardingFlowContext): number {
  const steps = activeSteps(ctx);
  const index = steps.indexOf(step as OnboardingStep);
  if (index < 0) return 0;
  return (index + 1) / steps.length;
}

export function isOnboardingStep(value: string): value is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(value);
}
