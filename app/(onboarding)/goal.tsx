import { useTranslation } from 'react-i18next';

import {
  defaultGoalRate,
  suggestTargetWeight,
  validateTargetWeight,
  type Goal,
} from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { ChoiceStep } from '@/features/auth/components/ChoiceStep';

export default function GoalScreen() {
  const { t } = useTranslation();
  const goal = useOnboardingStore((s) => s.draft.goal);
  const update = useOnboardingStore((s) => s.update);

  function onSelect(nextGoal: Goal) {
    const draft = useOnboardingStore.getState().draft;
    let targetWeightKg: number | null = null;
    if (nextGoal !== 'maintain' && draft.weightKg && draft.heightCm) {
      const ctx = {
        goal: nextGoal,
        currentWeightKg: draft.weightKg,
        heightCm: draft.heightCm,
      };
      const previous = draft.targetWeightKg;
      const previousStillFits =
        previous != null &&
        ['ok', 'underweight'].includes(
          validateTargetWeight({ ...ctx, targetWeightKg: previous }),
        );
      targetWeightKg = previousStillFits ? previous : suggestTargetWeight(ctx);
    }
    update({
      goal: nextGoal,
      // Maintain has no rate — pin it to 0 so rate/result never carry a stale value.
      goalRateKgPerWeek: defaultGoalRate(nextGoal, draft.goalRateKgPerWeek),
      targetWeightKg,
    });
  }

  return (
    <ChoiceStep<Goal>
      step="goal"
      title={t('account.onboarding.goal.title')}
      subtitle={t('account.onboarding.goal.subtitle')}
      selected={goal}
      onSelect={onSelect}
      options={[
        {
          value: 'lose',
          symbol: 'arrow.down.circle.fill',
          label: t('account.onboarding.goal.lose'),
          description: t('account.onboarding.goal.loseDescription'),
        },
        {
          value: 'maintain',
          symbol: 'equal.circle.fill',
          label: t('account.onboarding.goal.maintain'),
          description: t('account.onboarding.goal.maintainDescription'),
        },
        {
          value: 'gain',
          symbol: 'arrow.up.circle.fill',
          label: t('account.onboarding.goal.gain'),
          description: t('account.onboarding.goal.gainDescription'),
        },
      ]}
    />
  );
}
