import { Host, Slider } from '@expo/ui/swift-ui';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  healthyWeightRange,
  suggestTargetWeight,
  targetWeightBounds,
  validateTargetWeight,
  type Goal,
} from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { CountUpText } from '@/features/auth/components/CountUpText';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { formatLongDate, formatWeight } from '@/features/auth/format';
import { useDraftProjection } from '@/features/auth/useDraftProjection';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';

const STEP_KG = 0.5;

function StepButton({ symbol, onPress, label }: { symbol: 'minus' | 'plus'; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      className="h-12 w-12 items-center justify-center rounded-full bg-secondary-system-background"
    >
      <SymbolView name={symbol} size={18} weight="semibold" />
    </Pressable>
  );
}

export default function TargetWeightScreen() {
  const { t } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const { goNext } = useOnboardingNavigation('target-weight');
  const projection = useDraftProjection();

  const goal = (draft.goal ?? 'lose') as Goal;
  const currentWeightKg = draft.weightKg ?? 0;
  const heightCm = draft.heightCm ?? 0;
  const ctx = { goal, currentWeightKg, heightCm };
  const bounds = targetWeightBounds(ctx);

  // Weight/goal may have changed since the target was picked — fall back to a fresh suggestion.
  useEffect(() => {
    const { draft: d } = useOnboardingStore.getState();
    if (!d.goal || d.goal === 'maintain' || !d.weightKg || !d.heightCm) return;
    const c = { goal: d.goal, currentWeightKg: d.weightKg, heightCm: d.heightCm };
    const valid =
      d.targetWeightKg != null && ['ok', 'underweight'].includes(validateTargetWeight({ ...c, targetWeightKg: d.targetWeightKg }));
    if (!valid) update({ targetWeightKg: suggestTargetWeight(c) });
  }, [update]);

  const target = draft.targetWeightKg ?? suggestTargetWeight(ctx);
  const status = validateTargetWeight({ ...ctx, targetWeightKg: target });
  const healthy = healthyWeightRange(heightCm);
  const unit = draft.unitSystem;
  const noRange = bounds.minKg >= bounds.maxKg;

  function setTarget(kg: number) {
    const clamped = Math.min(Math.max(kg, bounds.minKg), bounds.maxKg);
    if (clamped === draft.targetWeightKg) return;
    void Haptics.selectionAsync();
    update({ targetWeightKg: clamped });
  }

  return (
    <OnboardingScreen
      title={t('account.onboarding.targetWeight.title')}
      subtitle={t('account.onboarding.targetWeight.subtitle')}
      continueLabel={t('account.common.continue')}
      continueDisabled={status === 'tooLow' || status === 'wrongDirection'}
      onContinue={() => goNext()}
      secondaryLabel={t('account.common.skip')}
      onSecondary={() => {
        update({ targetWeightKg: null });
        goNext();
      }}
    >
      <View className="items-center gap-1 pt-2">
        <View className="flex-row items-center gap-6">
          <StepButton symbol="minus" label={t('account.common.decrease')} onPress={() => setTarget(target - STEP_KG)} />
          <CountUpText
            value={target}
            duration={200}
            format={(v) => formatWeight(v, unit)}
            className="min-w-40 text-center text-5xl font-bold text-label"
          />
          <StepButton symbol="plus" label={t('account.common.increase')} onPress={() => setTarget(target + STEP_KG)} />
        </View>
        <View className="flex-row gap-2 pt-2">
          <Text className="rounded-full bg-secondary-system-background px-3 py-1 text-sm text-secondary-label">
            {t('account.onboarding.targetWeight.current', { value: formatWeight(currentWeightKg, unit) })}
          </Text>
          <Text className="rounded-full bg-secondary-system-background px-3 py-1 text-sm font-semibold text-tint">
            {t('account.onboarding.targetWeight.difference', {
              value: formatWeight(Math.abs(currentWeightKg - target), unit),
            })}
          </Text>
        </View>
      </View>

      {noRange ? null : (
        <Host style={{ width: '100%', height: 44 }}>
          <Slider value={target} min={bounds.minKg} max={bounds.maxKg} step={STEP_KG} onValueChange={setTarget} />
        </Host>
      )}

      <Text className="text-center text-sm text-secondary-label">
        {t('account.onboarding.targetWeight.healthyRange', {
          min: formatWeight(healthy.minKg, unit, 0),
          max: formatWeight(healthy.maxKg, unit, 0),
        })}
      </Text>

      {noRange ? (
        <Text className="text-center text-base text-label">{t('account.onboarding.targetWeight.noRange')}</Text>
      ) : status === 'tooLow' ? (
        <Text className="text-center text-sm text-destructive">{t('account.onboarding.targetWeight.warnTooLow')}</Text>
      ) : status === 'underweight' ? (
        <Text className="text-center text-sm text-destructive">{t('account.onboarding.targetWeight.warnUnderweight')}</Text>
      ) : null}

      {projection?.targetDate && status !== 'tooLow' ? (
        <Animated.View entering={FadeIn.duration(250)} className="rounded-2xl bg-secondary-system-background p-4">
          <Text className="text-center text-base text-label">
            {t('account.onboarding.targetWeight.projection', { date: formatLongDate(projection.targetDate) })}
          </Text>
        </Animated.View>
      ) : null}
    </OnboardingScreen>
  );
}
