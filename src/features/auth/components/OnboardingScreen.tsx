import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from './GlassButton';

/**
 * Shared chrome for every onboarding screen (PLAN §7.1, §2 "native first"):
 * large title + subtitle, scrollable content, and a full-width CTA pinned to
 * the bottom. See `GlassButton.tsx` for why the CTA is a styled Pressable
 * rather than `@expo/ui`'s native glass `Button` (unreliable single-tap
 * behavior on-device once this screen re-renders).
 */
export function OnboardingScreen({
  title,
  subtitle,
  children,
  continueLabel,
  onContinue,
  continueDisabled,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  continueLabel: string;
  onContinue: () => void;
  continueDisabled?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-system-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 px-6 pb-8 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text className="text-3xl font-bold text-label">{title}</Text>
          {subtitle ? <Text className="text-base text-secondary-label">{subtitle}</Text> : null}
        </View>
        <View className="gap-3">{children}</View>
      </ScrollView>
      <View
        className="border-t border-separator px-6 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <GlassButton label={continueLabel} onPress={onContinue} disabled={continueDisabled} />
      </View>
    </View>
  );
}
