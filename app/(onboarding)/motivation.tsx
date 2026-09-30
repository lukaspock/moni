import { useTranslation } from 'react-i18next';

import type { Motivation } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { ChoiceStep } from '@/features/auth/components/ChoiceStep';

export default function MotivationScreen() {
  const { t } = useTranslation();
  const motivation = useOnboardingStore((s) => s.draft.motivation);
  const name = useOnboardingStore((s) => s.draft.displayName.trim());
  const update = useOnboardingStore((s) => s.update);

  return (
    <ChoiceStep<Motivation>
      step="motivation"
      title={
        name
          ? t('account.onboarding.motivation.title', { name })
          : t('account.onboarding.motivation.titleNoName')
      }
      subtitle={t('account.onboarding.motivation.subtitle')}
      selected={motivation}
      onSelect={(value) => update({ motivation: value })}
      options={[
        {
          value: 'health',
          symbol: 'heart.fill',
          label: t('account.onboarding.motivation.health'),
          description: t('account.onboarding.motivation.healthDescription'),
        },
        {
          value: 'look',
          symbol: 'sparkles',
          label: t('account.onboarding.motivation.look'),
          description: t('account.onboarding.motivation.lookDescription'),
        },
        {
          value: 'performance',
          symbol: 'trophy.fill',
          label: t('account.onboarding.motivation.performance'),
          description: t(
            'account.onboarding.motivation.performanceDescription',
          ),
        },
        {
          value: 'energy',
          symbol: 'bolt.fill',
          label: t('account.onboarding.motivation.energy'),
          description: t('account.onboarding.motivation.energyDescription'),
        },
        {
          value: 'confidence',
          symbol: 'star.fill',
          label: t('account.onboarding.motivation.confidence'),
          description: t('account.onboarding.motivation.confidenceDescription'),
        },
      ]}
    />
  );
}
