/**
 * Today's "smart slot": the Today screen shows at most ONE contextual card
 * below the capture row. This picks which one, by a fixed priority, so the
 * screen never stacks parallel suggestions.
 *
 * Priority (today): firstRun > care > nextStep > trainingPlanned > fit
 * > restDay > trainingDone > none. Rest day sits low so plan-free users
 * don't see the same card every day ahead of real suggestions. Other days only show what happened
 * (trainingDone) — no suggestions for the past or tomorrow.
 */
import type { NextStepKind } from './rituals';

export type TodaySlotKind =
  | 'firstRun'
  | 'care'
  | 'restDay'
  | 'nextStep'
  | 'trainingPlanned'
  | 'fit'
  | 'trainingDone'
  | 'none';

/** Next-step kinds that have their own card; the rest are covered elsewhere or have no target. */
export const SLOT_NEXT_STEP_KINDS: readonly NextStepKind[] = [
  'logWeight',
  'proteinBridge',
  'startWorkout',
];

export interface TodaySlotInput {
  /** the viewed day is today */
  isToday: boolean;
  /** daily targets exist (a hero is shown) */
  hasTargets: boolean;
  /** brand-new user without any food yet */
  firstRun: boolean;
  /** care signal flagged and not dismissed for today */
  careOpen: boolean;
  /** next best step from `nextBestStep` */
  nextStep: NextStepKind;
  /** a training is planned for the viewed day */
  trainingPlanned: boolean;
  /** at least one completed workout on the viewed day */
  workoutDone: boolean;
  /** today is a plan-free day and the rest day is not confirmed yet */
  restDayOpen: boolean;
  /** "still fits" has at least one suggestion */
  fitAvailable: boolean;
}

/** Picks the single contextual card for Today (first match wins). */
export function pickTodaySlot(input: TodaySlotInput): TodaySlotKind {
  if (!input.isToday) return input.workoutDone ? 'trainingDone' : 'none';
  if (input.firstRun) return 'firstRun';
  if (input.careOpen) return 'care';
  if (input.hasTargets && SLOT_NEXT_STEP_KINDS.includes(input.nextStep)) {
    return 'nextStep';
  }
  if (input.trainingPlanned && !input.workoutDone) return 'trainingPlanned';
  if (input.fitAvailable) return 'fit';
  if (input.restDayOpen && !input.trainingPlanned && !input.workoutDone) {
    return 'restDay';
  }
  if (input.workoutDone) return 'trainingDone';
  return 'none';
}
