import { Host, Slider } from '@expo/ui/swift-ui';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { roundTo, type PaceLevel } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { CountUpText } from '@/features/auth/components/CountUpText';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { formatKcal, formatLongDate, formatSignedWeight } from '@/features/auth/format';
import { useDraftProjection } from '@/features/auth/useDraftProjection';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';
import { themeColor } from '@/theme/colors';

const MIN_RATE = 0.1;
const MAX_RATE_LOSE = 1.0;
const MAX_RATE_GAIN = 0.75;
const STEP = 0.05;

export default function RateScreen() {
  const { t } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const { goNext } = useOnboardingNavigation('rate');
  const projection = useDraftProjection();

  const isLoss = draft.goal === 'lose';
  const maxRate = isLoss ? MAX_RATE_LOSE : MAX_RATE_GAIN;
  const magnitude = Math.min(Math.max(Math.abs(draft.goalRateKgPerWeek || 0.5), MIN_RATE), maxRate);
  const unit = draft.unitSystem;

  function onRateChange(value: number) {
    const next = roundTo(isLoss ? -value : value, 2);
    if (next === draft.goalRateKgPerWeek) return;
    void Haptics.selectionAsync();
    update({ goalRateKgPerWeek: next });
  }

  const paceLabels: Record<PaceLevel, { label: string; hint: string }> = {
    gentle: { label: t('account.onboarding.rate.paceGentle'), hint: t('account.onboarding.rate.paceGentleHint') },
    balanced: { label: t('account.onboarding.rate.paceBalanced'), hint: t('account.onboarding.rate.paceBalancedHint') },
    aggressive: {
      label: t('account.onboarding.rate.paceAggressive'),
      hint: t('account.onboarding.rate.paceAggressiveHint'),
    },
  };
  const pace = projection?.pace ?? 'balanced';
  const isAggressive = pace === 'aggressive';
  const flags = projection?.preview.base.flags;
  const capped = !!flags && (flags.deficitCapped || flags.surplusCapped);

  return (
    <OnboardingScreen
      title={t('account.onboarding.rate.title')}
      subtitle={t(isLoss ? 'account.onboarding.rate.subtitleLose' : 'account.onboarding.rate.subtitleGain')}
      continueLabel={t('account.common.continue')}
      onContinue={() => goNext()}
    >
      <View className="items-center gap-3 pt-2">
        <Text className="text-4xl font-bold text-label">
          {t('account.onboarding.rate.perWeekFormatted', {
            value: formatSignedWeight(isLoss ? -magnitude : magnitude, unit),
          })}
        </Text>
        <Animated.View
          layout={LinearTransition.duration(200)}
          className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
            isAggressive ? 'bg-destructive' : 'bg-tint'
          }`}
        >
          <SymbolView
            name={isAggressive ? 'exclamationmark.triangle.fill' : 'checkmark.seal.fill'}
            size={14}
            tintColor="white"
          />
          <Text className="text-sm font-semibold text-white">{paceLabels[pace].label}</Text>
        </Animated.View>
      </View>

      <Host style={{ width: '100%', height: 44 }}>
        <Slider value={magnitude} min={MIN_RATE} max={maxRate} step={STEP} onValueChange={onRateChange} />
      </Host>

      <Text className={`text-center text-sm ${isAggressive ? 'text-destructive' : 'text-secondary-label'}`}>
        {paceLabels[pace].hint}
      </Text>

      {projection ? (
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1 rounded-2xl bg-secondary-system-background p-4">
            <Text className="text-xs font-semibold uppercase text-secondary-label">
              {t('account.onboarding.rate.dailyTarget')}
            </Text>
            <CountUpText
              value={projection.preview.restDay.totalKcal}
              format={formatKcal}
              className="text-3xl font-bold text-label"
            />
            <Text className="text-xs text-secondary-label">{t('account.onboarding.rate.kcalPerDay')}</Text>
          </View>
          <View className="flex-1 gap-1 rounded-2xl bg-secondary-system-background p-4">
            <Text className="text-xs font-semibold uppercase text-secondary-label">
              {t('account.onboarding.rate.reachBy')}
            </Text>
            {projection.targetDate ? (
              <Animated.Text
                key={projection.targetDate.toDateString()}
                entering={FadeIn.duration(200)}
                className="text-lg font-bold text-tint"
              >
                {formatLongDate(projection.targetDate)}
              </Animated.Text>
            ) : (
              <Text className="text-lg font-bold text-secondary-label">—</Text>
            )}
          </View>
        </View>
      ) : null}

      {projection ? (
        <Text className="text-center text-sm text-secondary-label">
          {t(projection.dailyDeltaKcal < 0 ? 'account.onboarding.rate.deficit' : 'account.onboarding.rate.surplus', {
            value: formatKcal(Math.abs(projection.dailyDeltaKcal)),
          })}
        </Text>
      ) : null}

      {capped && projection ? (
        <View className="flex-row items-start gap-2 rounded-2xl bg-secondary-system-background p-4">
          <SymbolView name="shield.lefthalf.filled" size={18} tintColor={themeColor('accent')} />
          <Text className="flex-1 text-sm text-label">
            {t('account.onboarding.rate.capped', {
              value: formatSignedWeight(projection.effectiveRateKgPerWeek, unit),
            })}
          </Text>
        </View>
      ) : null}
      {flags?.minimumFloorApplied ? (
        <Text className="text-center text-sm text-secondary-label">{t('account.onboarding.result.guardrailMinimum')}</Text>
      ) : null}
    </OnboardingScreen>
  );
}
