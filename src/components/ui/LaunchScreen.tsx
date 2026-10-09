import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { LogoMark } from '@/components/brand';
import { storage } from '@/lib/storage';
import { greetingPeriod } from '@/features/auth/format';

/** Native splash uses imageWidth 200 on a 1024 canvas (see app.config.ts). */
const LOGO_SIZE = 200;
const NAME_KEY = 'launch:displayName';

/** Remember the display name so the next cold start can greet the user immediately. */
export function rememberDisplayName(name: string | null | undefined): void {
  const trimmed = name?.trim();
  if (trimmed) storage.set(NAME_KEY, trimmed);
}

/**
 * Shown while the session/profile load (same look and position as the native splash: the logo mark
 * centred on the system background), plus a personal greeting once we know the name from the last launch.
 */
export function LaunchScreen() {
  const { t } = useTranslation();
  const name = storage.getString(NAME_KEY) ?? '';
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
    );
  }, [pulse]);
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const greetings = {
    morning: t('account.greeting.morning', { name }),
    afternoon: t('account.greeting.afternoon', { name }),
    evening: t('account.greeting.evening', { name }),
  };

  return (
    <View className="bg-system-background flex-1">
      {/* Same image size as the native splash (imageWidth 200), exactly centred. */}
      <View className="absolute inset-0 items-center justify-center">
        <Animated.View style={logoStyle}>
          <LogoMark size={LOGO_SIZE} variant="adaptive" />
        </Animated.View>
      </View>
      <View
        className="absolute inset-x-0 items-center gap-6 px-8"
        style={{ top: '50%', marginTop: LOGO_SIZE * 0.31 + 24 }}
      >
        {name ? (
          <Animated.Text
            entering={FadeIn.duration(400)}
            className="text-label text-center text-2xl font-semibold"
          >
            {greetings[greetingPeriod()]}
          </Animated.Text>
        ) : (
          <Text className="text-label text-center text-3xl font-bold">
            møni
          </Text>
        )}
        <ActivityIndicator />
      </View>
    </View>
  );
}
