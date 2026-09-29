import { Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isHealthAvailable } from '@/features/health';
import { useOnboardingStore } from '@/features/auth';
import { isOnboardingStep, onboardingProgress } from '@/features/auth/onboardingFlow';

/** Height of the native navigation bar (iOS 26, non-large title). */
const NAV_BAR_HEIGHT = 44;
/** Keep clear of the native back button on the left (and mirror it on the right). */
const BAR_SIDE_INSET = 64;

/**
 * Thin progress bar that lives *outside* the per-screen stack so its width
 * animates continuously from step to step (≤300 ms, instant under Reduce
 * Motion). Sits vertically centred in the transparent native header, between
 * the back button and the right edge — hidden on Welcome / Calculating.
 */
function OnboardingProgressBar() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const goal = useOnboardingStore((s) => s.draft.goal);

  const step = pathname.split('/').filter(Boolean).pop() ?? '';
  const visible = isOnboardingStep(step) && step !== 'calculating';
  const progress = onboardingProgress(step, { goal, healthAvailable: isHealthAvailable() });

  const width = useSharedValue(progress);
  useEffect(() => {
    width.value = withTiming(progress, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [progress, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('account.onboarding.progressLabel')}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={{
        position: 'absolute',
        top: insets.top + NAV_BAR_HEIGHT / 2 - 3,
        left: BAR_SIDE_INSET,
        right: BAR_SIDE_INSET,
      }}
      className="h-1.5 overflow-hidden rounded-full bg-secondary-system-background"
    >
      <Animated.View style={fillStyle} className="h-full rounded-full bg-tint" />
    </View>
  );
}

/**
 * Native Stack with a transparent, title-less header: each screen draws its
 * own big title inside `OnboardingScreen` (so the CTA can be pinned below);
 * the header only provides the native glass back button + safe-area inset.
 */
export default function OnboardingLayout() {
  return (
    <View className="flex-1 bg-system-background">
      <Stack
        screenOptions={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="calculating" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="result" options={{ headerBackVisible: false, gestureEnabled: false }} />
      </Stack>
      <OnboardingProgressBar />
    </View>
  );
}
