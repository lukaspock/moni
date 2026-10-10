import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Illustration } from '@/components/brand';
import { Reveal } from '@/components/motion';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import type { SFSymbol } from '@/features/auth/components/OptionCard';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';
import {
  requestHealthAuthorization,
  useHealthSettings,
} from '@/features/health';
import { themeColor } from '@/theme/colors';
import { haptic } from '@/lib/haptics';

function Benefit({
  symbol,
  text,
  index,
}: {
  symbol: SFSymbol;
  text: string;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(120 + index * 70)}
      className="flex-row items-center gap-3"
    >
      <SymbolView
        name={symbol}
        size={22}
        type="hierarchical"
        tintColor={themeColor('accent')}
      />
      <Text className="text-label flex-1 text-base">{text}</Text>
    </Animated.View>
  );
}

/**
 * Apple Health primer: explain the benefit first, then show the system sheet
 * (`requestHealthAuthorization`, health contract). Skippable. Only reached when
 * `isHealthAvailable()` (see `onboardingFlow.ts`).
 */
export default function HealthPrimerScreen() {
  const { t } = useTranslation();
  const { setEnabled } = useHealthSettings();
  const { goNext } = useOnboardingNavigation('health');
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    try {
      const result = await requestHealthAuthorization();
      if (result === 'granted') {
        setEnabled(true);
        haptic.onboardResult();
      }
    } catch (error) {
      console.warn('[onboarding] health authorization failed', error);
    } finally {
      setBusy(false);
      goNext();
    }
  }

  return (
    <OnboardingScreen
      title={t('account.onboarding.health.title')}
      subtitle={t('account.onboarding.health.subtitle')}
      continueLabel={t('account.onboarding.health.cta')}
      onContinue={connect}
      continueLoading={busy}
      secondaryLabel={t('account.onboarding.health.later')}
      onSecondary={() => goNext()}
    >
      <Reveal>
        <View className="items-center py-2">
          <Illustration name="healthPrimer" size={200} />
        </View>
      </Reveal>
      <View className="gap-4">
        <Benefit
          index={0}
          symbol="figure.run"
          text={t('account.onboarding.health.benefit1')}
        />
        <Benefit
          index={1}
          symbol="scalemass.fill"
          text={t('account.onboarding.health.benefit2')}
        />
        <Benefit
          index={2}
          symbol="flame.fill"
          text={t('account.onboarding.health.benefit3')}
        />
      </View>
      <Text className="text-label-secondary pt-2 text-sm">
        {t('account.onboarding.health.privacy')}
      </Text>
    </OnboardingScreen>
  );
}
