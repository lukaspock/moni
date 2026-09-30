import { useMemo, useState } from 'react';

import { computeGoalProjection, type GoalProjectionResult } from '../../domain';
import { isDraftComplete, useOnboardingStore } from './onboardingStore';

/**
 * Live goal projection (targets, pace, goal date, curve) for the current
 * onboarding draft — `null` until every input of the formula is answered.
 * All math lives in `src/domain/onboarding.ts::computeGoalProjection`.
 */
export function useDraftProjection(): GoalProjectionResult | null {
  const draft = useOnboardingStore((s) => s.draft);
  const [today] = useState(() => new Date());

  return useMemo(() => {
    if (!isDraftComplete(draft)) return null;
    return computeGoalProjection({
      sex: draft.sex!,
      birthDate: new Date(`${draft.birthDate}T00:00:00`),
      heightCm: draft.heightCm!,
      weightKg: draft.weightKg!,
      activityLevel: draft.activityLevel!,
      goal: draft.goal!,
      goalRateKgPerWeek:
        draft.goal === 'maintain' ? 0 : draft.goalRateKgPerWeek,
      hasTrainingDays: draft.trainingWeekdays.length > 0,
      eatBackFactor: draft.eatBackFactor,
      targetWeightKg: draft.targetWeightKg,
      startDate: today,
    });
  }, [draft, today]);
}
