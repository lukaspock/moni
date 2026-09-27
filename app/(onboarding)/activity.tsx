import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { ActivityLevel } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { OptionCard } from '@/features/auth/components/OptionCard';

const LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active'];

export default function ActivityScreen() {
  const { t } = useTranslation();
  const activityLevel = useOnboardingStore((s) => s.draft.activityLevel);
  const update = useOnboardingStore((s) => s.update);

  return (
    <OnboardingScreen
      title={t('account.onboarding.activity.title')}
      subtitle={t('account.onboarding.activity.subtitle')}
      continueLabel={t('account.common.continue')}
      continueDisabled={!activityLevel}
      onContinue={() => router.push('/(onboarding)/goal')}
    >
      {LEVELS.map((level) => (
        <OptionCard
          key={level}
          label={t(`account.onboarding.activity.${level}`)}
          description={t(`account.onboarding.activity.${level}Description`)}
          selected={activityLevel === level}
          onPress={() => update({ activityLevel: level })}
        />
      ))}
    </OnboardingScreen>
  );
}
