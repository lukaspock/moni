import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, Text } from 'react-native';

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
 * instead — reliability over pixel-perfect glass on this one control.
 */
export function GlassButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const isDisabled = !!disabled || !!loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      className={`h-14 w-full flex-row items-center justify-center rounded-full bg-tint ${isDisabled ? 'opacity-40' : ''}`}
    >
      {loading ? <ActivityIndicator color="white" /> : <Text className="text-lg font-semibold text-white">{label}</Text>}
    </Pressable>
  );
}
