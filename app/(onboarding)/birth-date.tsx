import { DatePicker, Host } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  datePickerStyle,
  environment,
  labelsHidden,
} from '@expo/ui/swift-ui/modifiers';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ageFromBirthDate } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { CountUpText } from '@/features/auth/components/CountUpText';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';
import { toISODate } from '@/lib/date';

const MIN_BIRTH_DATE = new Date(1920, 0, 1);
const MAX_BIRTH_DATE = new Date();
MAX_BIRTH_DATE.setFullYear(MAX_BIRTH_DATE.getFullYear() - 13); // sensible minimum age

const DEFAULT_BIRTH_DATE = new Date(1995, 0, 1);

export default function BirthDateScreen() {
  const { t, i18n } = useTranslation();
  const birthDate = useOnboardingStore((s) => s.draft.birthDate);
  const update = useOnboardingStore((s) => s.update);
  const { goNext } = useOnboardingNavigation('birth-date');

  // The DatePicker always shows a concrete date (defaulting to
  // DEFAULT_BIRTH_DATE when nothing was chosen yet) — that shown value must
  // count as the answer, so write it into the draft on first mount instead
  // of leaving Continue disabled until the user manually touches the wheel.
  useEffect(() => {
    if (!birthDate) {
      update({ birthDate: toISODate(DEFAULT_BIRTH_DATE) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  const selected = birthDate
    ? new Date(`${birthDate}T00:00:00`)
    : DEFAULT_BIRTH_DATE;
  const age = ageFromBirthDate(selected);

  return (
    <OnboardingScreen
      title={t('account.onboarding.birthDate.title')}
      subtitle={t('account.onboarding.birthDate.subtitle')}
      continueLabel={t('account.common.continue')}
      continueDisabled={!birthDate}
      onContinue={() => goNext()}
    >
      <View className="items-center py-2">
        <CountUpText
          value={age}
          duration={250}
          format={(v) =>
            t('account.onboarding.birthDate.age', { value: Math.round(v) })
          }
          className="text-tint font-display-black text-[40px] leading-[44px]"
        />
      </View>
      <Host matchContents style={{ alignSelf: 'center' }}>
        <DatePicker
          title={t('account.onboarding.birthDate.label')}
          selection={selected}
          displayedComponents={['date']}
          range={{ start: MIN_BIRTH_DATE, end: MAX_BIRTH_DATE }}
          modifiers={[
            datePickerStyle('wheel'),
            // The wheel would otherwise render the title inline and overflow the screen.
            labelsHidden(),
            accessibilityLabel(t('account.onboarding.birthDate.label')),
            // Follow the in-app language, not the device locale (month names).
            environment({ key: 'locale', value: i18n.language }),
          ]}
          onDateChange={(date) => update({ birthDate: toISODate(date) })}
        />
      </Host>
    </OnboardingScreen>
  );
}
