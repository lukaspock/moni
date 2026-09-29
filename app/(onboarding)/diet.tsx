import { useTranslation } from 'react-i18next';

import type { Diet } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { ChoiceStep } from '@/features/auth/components/ChoiceStep';

export default function DietScreen() {
  const { t } = useTranslation();
  const diet = useOnboardingStore((s) => s.draft.diet);
  const update = useOnboardingStore((s) => s.update);

  return (
    <ChoiceStep<Diet>
      step="diet"
      title={t('account.onboarding.diet.title')}
      subtitle={t('account.onboarding.diet.subtitle')}
      selected={diet}
      onSelect={(value) => update({ diet: value })}
      options={[
        {
          value: 'omnivore',
          emoji: '🍽️',
          label: t('account.onboarding.diet.omnivore'),
          description: t('account.onboarding.diet.omnivoreDescription'),
        },
        {
          value: 'flexitarian',
          emoji: '🥗',
          label: t('account.onboarding.diet.flexitarian'),
          description: t('account.onboarding.diet.flexitarianDescription'),
        },
        {
          value: 'pescetarian',
          emoji: '🐟',
          label: t('account.onboarding.diet.pescetarian'),
          description: t('account.onboarding.diet.pescetarianDescription'),
        },
        {
          value: 'vegetarian',
          emoji: '🧀',
          label: t('account.onboarding.diet.vegetarian'),
          description: t('account.onboarding.diet.vegetarianDescription'),
        },
        {
          value: 'vegan',
          emoji: '🌱',
          label: t('account.onboarding.diet.vegan'),
          description: t('account.onboarding.diet.veganDescription'),
        },
      ]}
    />
  );
}
