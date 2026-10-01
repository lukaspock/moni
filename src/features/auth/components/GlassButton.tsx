import * as Haptics from 'expo-haptics';
import { GlassView } from 'expo-glass-effect';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useThemeHex } from '@/theme/colors';

/**
 * Primary CTA button for onboarding/sign-in.
 *
 * Originally this used `@expo/ui/swift-ui`'s `Button` with
 * `buttonStyle('glassProminent')` (real native Liquid Glass, iOS 26+) — but
 * on-device it reliably swallowed the first tap (and sometimes several more)
 * once the surrounding screen re-rendered/passed a `disabled` modifier,
 * making onboarding un-completable with single taps. Confirmed in the
 * simulator: the plain `@expo/ui` `Button` on the Welcome screen (no
 * `disabled` modifier, no re-rendering parent) advanced on the first tap;
 * the one in `OnboardingScreen` (rebuilds every render via the `disabled()`
 * modifier + a `useSafeAreaInsets()`-driven parent) did not respond to three
 * consecutive taps. Per PLAN §2's own fallback rule ("if a component is
 * missing or doesn't work, use plain RN Pressable/Text with NativeWind"),
 * this is a plain Pressable styled to read as a filled/prominent button
 * instead. The primary variant now renders the same tinted `GlassView`
 * inside a plain `Pressable` as `GlassActionButton` (taps stay on the RN
 * Pressable, which is what made that approach reliable).
 */
export function GlassButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** 'secondary' = clearly visible outlined button (e.g. "I already have an account") */
  variant?: 'primary' | 'secondary';
}) {
  const isDisabled = !!disabled || !!loading;
  const isPrimary = variant === 'primary';
  const tint = useThemeHex('accent');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={() => {
        void Haptics.impactAsync(
          isPrimary
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        );
        onPress();
      }}
      style={{ opacity: isDisabled ? 0.4 : 1 }}
    >
      {isPrimary ? (
        <GlassView
          glassEffectStyle="regular"
          tintColor={tint}
          isInteractive
          style={{
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-lg font-semibold text-white">{label}</Text>
          )}
        </GlassView>
      ) : (
        <View className="border-separator bg-secondary-system-background h-14 w-full items-center justify-center rounded-full border">
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-label text-lg font-semibold">{label}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}
