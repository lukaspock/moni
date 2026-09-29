import { useTranslation } from 'react-i18next';

import type { ActivityLevel } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { ChoiceStep } from '@/features/auth/components/ChoiceStep';

export default function ActivityScreen() {
  const { t } = useTranslation();
  const activityLevel = useOnboardingStore((s) => s.draft.activityLevel);
  const update = useOnboardingStore((s) => s.update);

  return (
    <ChoiceStep<ActivityLevel>
      step="activity"
      title={t('account.onboarding.activity.title')}
      subtitle={t('account.onboarding.activity.subtitle')}
      selected={activityLevel}
      onSelect={(value) => update({ activityLevel: value })}
      options={[
        {
          value: 'sedentary',
          symbol: 'desktopcomputer',
          label: t('account.onboarding.activity.sedentary'),
          description: t('account.onboarding.activity.sedentaryDescription'),
        },
        {
          value: 'light',
          symbol: 'figure.walk',
          label: t('account.onboarding.activity.light'),
          description: t('account.onboarding.activity.lightDescription'),
        },
        {
          value: 'moderate',
          symbol: 'figure.hiking',
          label: t('account.onboarding.activity.moderate'),
          description: t('account.onboarding.activity.moderateDescription'),
        },
        {
          value: 'active',
          symbol: 'figure.run',
          label: t('account.onboarding.activity.active'),
          description: t('account.onboarding.activity.activeDescription'),
        },
      ]}
    />
  );
}
