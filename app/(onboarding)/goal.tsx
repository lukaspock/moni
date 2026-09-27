import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { Goal } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { OptionCard } from '@/features/auth/components/OptionCard';

const GOALS: Goal[] = ['lose', 'maintain', 'gain'];

export default function GoalScreen() {
  const { t } = useTranslation();
  const goal = useOnboardingStore((s) => s.draft.goal);
  const update = useOnboardingStore((s) => s.update);

  function onSelect(nextGoal: Goal) {
    // Maintain has no rate to pick — pin it to 0 so `rate.tsx` (and the
    // result preview) don't carry over a stale non-zero value.
    update({ goal: nextGoal, goalRateKgPerWeek: nextGoal === 'maintain' ? 0 : useOnboardingStore.getState().draft.goalRateKgPerWeek || (nextGoal === 'lose' ? -0.5 : 0.25) });
  }

  return (
    <OnboardingScreen
      title={t('account.onboarding.goal.title')}
      subtitle={t('account.onboarding.goal.subtitle')}
      continueLabel={t('account.common.continue')}
      continueDisabled={!goal}
      onContinue={() => router.push(goal === 'maintain' ? '/(onboarding)/schedule' : '/(onboarding)/rate')}
    >
      {GOALS.map((g) => (
        <OptionCard
          key={g}
          label={t(`account.onboarding.goal.${g}`)}
          description={t(`account.onboarding.goal.${g}Description`)}
          selected={goal === g}
          onPress={() => onSelect(g)}
        />
      ))}
    </OnboardingScreen>
  );
}
