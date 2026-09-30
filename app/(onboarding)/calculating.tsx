import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useReducedMotion,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboardingStore } from '@/features/auth';
import { CountUpText } from '@/features/auth/components/CountUpText';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';
import { themeColor } from '@/theme/colors';

const STEP_MS = 620;
const STEP_MS_REDUCED = 300;
const STEP_COUNT = 4;

/**
 * "Crafting your plan…" interstitial (~2.6 s): four steps tick off one by one
 * with a light haptic each, a percentage counts up, then a success haptic and
 * an automatic hand-off to the result screen. The numbers are computed
 * instantly anyway — this beat exists so the result feels earned.
 */
export default function CalculatingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const name = useOnboardingStore((s) => s.draft.displayName.trim());
  const { goNext } = useOnboardingNavigation('calculating');
  const [done, setDone] = useState(0);

  const stepMs = reduceMotion ? STEP_MS_REDUCED : STEP_MS;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= STEP_COUNT; i += 1) {
      timers.push(
        setTimeout(() => {
          setDone(i);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, i * stepMs),
      );
    }
    timers.push(
      setTimeout(
        () => {
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        },
        STEP_COUNT * stepMs + 150,
      ),
    );
    timers.push(
      setTimeout(() => goNext({ replace: true }), STEP_COUNT * stepMs + 650),
    );
    return () => timers.forEach(clearTimeout);
  }, [goNext, stepMs]);

  const steps = [
    t('account.onboarding.calculating.step1'),
    t('account.onboarding.calculating.step2'),
    t('account.onboarding.calculating.step3'),
    t('account.onboarding.calculating.step4'),
  ];
  const finished = done >= STEP_COUNT;

  return (
    <View
      className="bg-system-background flex-1 justify-center gap-10 px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="items-center gap-4">
        <View className="bg-secondary-system-background h-28 w-28 items-center justify-center rounded-full">
          {finished ? (
            <Animated.View entering={ZoomIn.duration(250)}>
              <SymbolView
                name="checkmark.circle.fill"
                size={64}
                tintColor={themeColor('accent')}
              />
            </Animated.View>
          ) : (
            <CountUpText
              value={100}
              startFrom={0}
              duration={STEP_COUNT * stepMs}
              format={(v) => `${Math.round(v)}%`}
              className="text-tint text-3xl font-bold"
            />
          )}
        </View>
        <Animated.Text
          entering={FadeIn.duration(250)}
          className="text-label text-center text-2xl font-bold"
        >
          {finished
            ? t('account.onboarding.calculating.done')
            : name
              ? t('account.onboarding.calculating.title', { name })
              : t('account.onboarding.calculating.titleNoName')}
        </Animated.Text>
      </View>

      <View className="gap-4">
        {steps.map((label, index) => {
          const isDone = done > index;
          const isActive = done === index;
          return (
            <Animated.View
              key={label}
              entering={FadeInDown.duration(250).delay(index * 60)}
              className="flex-row items-center gap-3"
            >
              <View className="h-7 w-7 items-center justify-center">
                {isDone ? (
                  <Animated.View entering={ZoomIn.duration(200)}>
                    <SymbolView
                      name="checkmark.circle.fill"
                      size={24}
                      tintColor={themeColor('accent')}
                    />
                  </Animated.View>
                ) : isActive ? (
                  <ActivityIndicator />
                ) : (
                  <View className="border-separator h-5 w-5 rounded-full border-2" />
                )}
              </View>
              <Text
                className={`text-base ${isDone || isActive ? 'text-label font-semibold' : 'text-secondary-label'}`}
              >
                {label}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
