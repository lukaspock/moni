import { DatePicker, Host } from '@expo/ui/swift-ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useOnboardingStore } from '@/features/auth';
import { toISODate } from '@/lib/date';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';

const MIN_BIRTH_DATE = new Date(1920, 0, 1);
const MAX_BIRTH_DATE = new Date();
MAX_BIRTH_DATE.setFullYear(MAX_BIRTH_DATE.getFullYear() - 13); // sensible minimum age

const DEFAULT_BIRTH_DATE = new Date(1995, 0, 1);

export default function BirthDateScreen() {
  const { t } = useTranslation();
  const birthDate = useOnboardingStore((s) => s.draft.birthDate);
  const update = useOnboardingStore((s) => s.update);

  const selected = birthDate ? new Date(`${birthDate}T00:00:00`) : DEFAULT_BIRTH_DATE;

  return (
    <OnboardingScreen
      title={t('account.onboarding.birthDate.title')}
      subtitle={t('account.onboarding.birthDate.subtitle')}
      continueLabel={t('account.common.continue')}
      continueDisabled={!birthDate}
      onContinue={() => router.push('/(onboarding)/body')}
    >
      <Host matchContents>
        <DatePicker
          title={t('account.onboarding.birthDate.label')}
          selection={selected}
          displayedComponents={['date']}
          range={{ start: MIN_BIRTH_DATE, end: MAX_BIRTH_DATE }}
          onDateChange={(date) => update({ birthDate: toISODate(date) })}
        />
      </Host>
    </OnboardingScreen>
  );
}
