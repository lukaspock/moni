import { Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion';
import { closeTrainingSetup } from '@/features/workout/setup';

/** Height of the native navigation bar (iOS 26, non-large title). */
const NAV_BAR_HEIGHT = 44;
/** Keep clear of the back button (left) and the "Later" button (right). */
const BAR_SIDE_INSET = 96;

const STEPS = ['training-setup', 'frequency', 'proposal'] as const;

function stepIndex(pathname: string): number {
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  return STEPS.indexOf(last as (typeof STEPS)[number]);
}

/** Thin progress bar over the transparent header, like onboarding (hidden on "done"). */
function SetupProgressBar() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const index = stepIndex(pathname);
  const progress = index < 0 ? 1 : (index + 1) / STEPS.length;

  const width = useSharedValue(progress);
  useEffect(() => {
    width.value = withTiming(progress, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [progress, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  if (index < 0) return null;

  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('trainingSetup.progressLabel')}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={{
        position: 'absolute',
        top: insets.top + NAV_BAR_HEIGHT / 2 - 3,
        left: BAR_SIDE_INSET,
        right: BAR_SIDE_INSET,
      }}
      className="bg-surface-raised h-1 overflow-hidden rounded-full"
    >
      <Animated.View
        style={fillStyle}
        className="bg-tint h-full rounded-full"
      />
    </View>
  );
}

function LaterButton() {
  const { t } = useTranslation();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('trainingSetup.later')}
      preset="subtle"
      hitSlop={8}
      onPress={closeTrainingSetup}
      className="px-2 py-1"
    >
      <Text className="text-label-secondary text-[17px]">
        {t('trainingSetup.later')}
      </Text>
    </PressableScale>
  );
}

/**
 * Training setup flow (docs/identity/06 §2): setting → frequency → proposal →
 * done. Registered as a fullScreenModal in `app/_layout.tsx`. Transparent,
 * title-less header (native back button + "Later"), each screen draws its
 * own big title via `OnboardingScreen`.
 */
export default function TrainingSetupLayout() {
  return (
    <View className="bg-bg flex-1">
      <Stack
        screenOptions={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          headerRight: () => <LaterButton />,
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="frequency" />
        <Stack.Screen name="proposal" />
        <Stack.Screen
          name="done"
          options={{ headerShown: false, gestureEnabled: false }}
        />
      </Stack>
      <SetupProgressBar />
    </View>
  );
}
