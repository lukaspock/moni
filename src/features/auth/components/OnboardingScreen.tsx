import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from './GlassButton';

/**
 * Shared chrome for every onboarding screen (PLAN §7.1, §2 "native first"):
 * large title + subtitle (fade/slide in), scrollable content, and a
 * full-width CTA pinned to the bottom (+ optional secondary text button).
 * See `GlassButton.tsx` for why the CTA is a styled Pressable rather than
 * `@expo/ui`'s native glass `Button`.
 *
 * `continueLabel` omitted → no CTA (auto-advancing single-choice screens).
 * Reanimated entering animations respect the system Reduce Motion setting
 * by default (`ReduceMotion.System`).
 */
export function OnboardingScreen({
  title,
  subtitle,
  children,
  continueLabel,
  onContinue,
  continueDisabled,
  continueLoading,
  secondaryLabel,
  onSecondary,
  footerNote,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  continueLabel?: string;
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  footerNote?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const hasFooter = !!continueLabel || !!secondaryLabel || !!footerNote;

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-system-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 px-6 pb-8 pt-6"
        contentContainerStyle={hasFooter ? undefined : { paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Animated.View entering={FadeInDown.duration(280)} className="gap-2">
          <Text className="text-3xl font-bold text-label">{title}</Text>
          {subtitle ? <Text className="text-base leading-6 text-secondary-label">{subtitle}</Text> : null}
        </Animated.View>
        <Animated.View entering={FadeIn.duration(280).delay(80)} className="gap-3">
          {children}
        </Animated.View>
      </ScrollView>
      {hasFooter ? (
        <View className="gap-1 px-6 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          {footerNote}
          {continueLabel && onContinue ? (
            <GlassButton
              label={continueLabel}
              onPress={onContinue}
              disabled={continueDisabled}
              loading={continueLoading}
            />
          ) : null}
          {secondaryLabel && onSecondary ? (
            <Pressable accessibilityRole="button" onPress={onSecondary} className="h-12 items-center justify-center">
              <Text className="text-base font-medium text-secondary-label">{secondaryLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
