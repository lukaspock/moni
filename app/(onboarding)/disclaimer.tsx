import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useOnboardingStore } from '@/features/auth';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import type { SFSymbol } from '@/features/auth/components/OptionCard';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';
import { themeColor } from '@/theme/colors';

function Point({ symbol, text, index }: { symbol: SFSymbol; text: string; index: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(260).delay(80 + index * 60)} className="flex-row items-start gap-3">
      <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-lg bg-secondary-system-background">
        <SymbolView name={symbol} size={18} type="hierarchical" tintColor={themeColor('accent')} />
      </View>
      <Text className="flex-1 text-base leading-6 text-label">{text}</Text>
    </Animated.View>
  );
}

/** "No medical advice" acknowledgement — required; stored as `health_disclaimer_accepted_at`. */
export default function DisclaimerScreen() {
  const { t } = useTranslation();
  const acceptedAt = useOnboardingStore((s) => s.draft.disclaimerAcceptedAt);
  const update = useOnboardingStore((s) => s.update);
  const { goNext } = useOnboardingNavigation('disclaimer');
  const [checked, setChecked] = useState(() => !!acceptedAt);

  return (
    <OnboardingScreen
      title={t('account.onboarding.disclaimer.title')}
      subtitle={t('account.onboarding.disclaimer.subtitle')}
      continueLabel={t('account.onboarding.disclaimer.cta')}
      continueDisabled={!checked}
      onContinue={() => {
        update({ disclaimerAcceptedAt: acceptedAt ?? new Date().toISOString() });
        goNext();
      }}
    >
      <View className="gap-4 py-2">
        <Point index={0} symbol="stethoscope" text={t('account.onboarding.disclaimer.point1')} />
        <Point index={1} symbol="cross.case.fill" text={t('account.onboarding.disclaimer.point2')} />
        <Point index={2} symbol="shield.lefthalf.filled" text={t('account.onboarding.disclaimer.point3')} />
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => {
          void Haptics.selectionAsync();
          setChecked((v) => !v);
        }}
        className={`mt-2 flex-row items-center gap-3 rounded-2xl border-2 p-4 ${
          checked ? 'border-tint bg-secondary-system-background' : 'border-separator'
        }`}
      >
        <SymbolView
          name={checked ? 'checkmark.square.fill' : 'square'}
          size={26}
          tintColor={checked ? themeColor('accent') : undefined}
        />
        <Text className="flex-1 text-base font-semibold text-label">{t('account.onboarding.disclaimer.accept')}</Text>
      </Pressable>
    </OnboardingScreen>
  );
}
