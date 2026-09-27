import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useOnboardingStore } from '@/features/auth';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { OptionCard } from '@/features/auth/components/OptionCard';

export default function SexScreen() {
  const { t } = useTranslation();
  const sex = useOnboardingStore((s) => s.draft.sex);
  const update = useOnboardingStore((s) => s.update);

  return (
    <OnboardingScreen
      title={t('account.onboarding.sex.title')}
      subtitle={t('account.onboarding.sex.subtitle')}
      continueLabel={t('account.common.continue')}
      continueDisabled={!sex}
      onContinue={() => router.push('/(onboarding)/birth-date')}
    >
      <OptionCard label={t('account.onboarding.sex.male')} selected={sex === 'male'} onPress={() => update({ sex: 'male' })} />
      <OptionCard
        label={t('account.onboarding.sex.female')}
        selected={sex === 'female'}
        onPress={() => update({ sex: 'female' })}
      />
    </OnboardingScreen>
  );
}
