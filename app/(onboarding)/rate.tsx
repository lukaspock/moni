import { Host, Slider } from '@expo/ui/swift-ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { roundTo } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';

const MIN_RATE = 0.1;
const MAX_RATE = 1.0;
const STEP = 0.05;

export default function RateScreen() {
  const { t } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);

  const isLoss = draft.goal === 'lose';
  const magnitude = Math.min(Math.max(Math.abs(draft.goalRateKgPerWeek || 0.5), MIN_RATE), MAX_RATE);

  return (
    <OnboardingScreen
      title={t('account.onboarding.rate.title')}
      subtitle={t(isLoss ? 'account.onboarding.rate.subtitleLose' : 'account.onboarding.rate.subtitleGain')}
      continueLabel={t('account.common.continue')}
      onContinue={() => router.push('/(onboarding)/schedule')}
    >
      <View className="items-center gap-4 py-6">
        <Text className="text-4xl font-bold text-label">
          {t('account.onboarding.rate.perWeek', { value: roundTo(isLoss ? -magnitude : magnitude, 2) })}
        </Text>
        <Host style={{ width: '100%', height: 44 }}>
          <Slider
            value={magnitude}
            min={MIN_RATE}
            max={MAX_RATE}
            step={STEP}
            onValueChange={(value) => update({ goalRateKgPerWeek: isLoss ? -value : value })}
          />
        </Host>
      </View>
    </OnboardingScreen>
  );
}
