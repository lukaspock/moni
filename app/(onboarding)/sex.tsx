import { useTranslation } from 'react-i18next';

import type { Sex } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { ChoiceStep } from '@/features/auth/components/ChoiceStep';

export default function SexScreen() {
  const { t } = useTranslation();
  const sex = useOnboardingStore((s) => s.draft.sex);
  const update = useOnboardingStore((s) => s.update);

  return (
    <ChoiceStep<Sex>
      step="sex"
      title={t('account.onboarding.sex.title')}
      subtitle={t('account.onboarding.sex.subtitle')}
      selected={sex}
      onSelect={(value) => update({ sex: value })}
      options={[
        {
          value: 'female',
          symbol: 'figure.stand.dress',
          label: t('account.onboarding.sex.female'),
        },
        {
          value: 'male',
          symbol: 'figure.stand',
          label: t('account.onboarding.sex.male'),
        },
      ]}
    />
  );
}
