import { useEffect } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useThemeHex } from '@/theme/colors';
import { storage } from '@/lib/storage';
import { greetingPeriod } from '@/features/auth/format';

const NAME_KEY = 'launch:displayName';

/** Remember the display name so the next cold start can greet the user immediately. */
export function rememberDisplayName(name: string | null | undefined): void {
  const trimmed = name?.trim();
  if (trimmed) storage.set(NAME_KEY, trimmed);
}

/**
 * Shown while the session/profile load (same look as the native splash: arm logo on the
 * system background), plus a personal greeting once we know the name from the last launch.
 */
export function LaunchScreen() {
  const { t } = useTranslation();
  const accent = useThemeHex('accent');
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
    <View className="bg-system-background flex-1 items-center justify-center gap-8 px-8">
      <Animated.View style={logoStyle}>
        <Image
          source={require('../../../assets/launch-arm.png')}
          style={{ width: 124, height: 124, tintColor: accent }}
          accessibilityLabel="møni"
        />
      </Animated.View>
      {name ? (
        <Animated.Text
          entering={FadeIn.duration(400)}
          className="text-label text-center text-2xl font-semibold"
        >
          {greetings[greetingPeriod()]}
        </Animated.Text>
      ) : (
        <Text className="text-label text-center text-3xl font-bold">møni</Text>
      )}
      <ActivityIndicator />
    </View>
  );
}
