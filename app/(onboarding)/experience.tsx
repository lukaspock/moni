import { useTranslation } from 'react-i18next';

import type { TrainingExperience } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { ChoiceStep } from '@/features/auth/components/ChoiceStep';

export default function ExperienceScreen() {
  const { t } = useTranslation();
  const experience = useOnboardingStore((s) => s.draft.trainingExperience);
  const update = useOnboardingStore((s) => s.update);

  return (
    <ChoiceStep<TrainingExperience>
      step="experience"
      title={t('account.onboarding.experience.title')}
      subtitle={t('account.onboarding.experience.subtitle')}
      selected={experience}
      onSelect={(value) => update({ trainingExperience: value })}
      options={[
        {
          value: 'beginner',
          symbol: 'figure.walk',
          label: t('account.onboarding.experience.beginner'),
          description: t('account.onboarding.experience.beginnerDescription'),
        },
        {
          value: 'intermediate',
          symbol: 'dumbbell.fill',
          label: t('account.onboarding.experience.intermediate'),
          description: t('account.onboarding.experience.intermediateDescription'),
        },
        {
          value: 'advanced',
          symbol: 'figure.strengthtraining.traditional',
          label: t('account.onboarding.experience.advanced'),
          description: t('account.onboarding.experience.advancedDescription'),
        },
      ]}
    />
  );
}
