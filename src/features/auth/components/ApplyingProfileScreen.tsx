import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RingPattern } from '@/components/brand';
import { PressableScale, TideLoader } from '@/components/motion';
import { fixedColors } from '@/theme/colors';
import { REDUCE, duration, exit } from '@/theme/motion';
import { maxFontSizeMultiplier } from '@/theme/typography';

import { GlassButton } from './GlassButton';

const PHASE_MS = 1400;

/**
 * Shown by the auth gate right after sign-up/sign-in while the onboarding
 * draft is written to the new account (usually < 1 s), or with a retry if
 * that failed (e.g. offline). Always-dark forest surface (same as the auth
 * hero) with the tide loader and a slowly changing phase line.
 */
export function ApplyingProfileScreen({
  failed,
  onRetry,
  onSignOut,
}: {
  failed: boolean;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [phaseIndex, setPhaseIndex] = useState(0);

  const phases = [
    t('account.auth.applying.phaseProfile'),
    t('account.auth.applying.phaseTargets'),
    t('account.auth.applying.title'),
  ];
  const lastPhase = phases.length - 1;
  const phase = phases[Math.min(phaseIndex, lastPhase)]!;

  useEffect(() => {
    if (failed || phaseIndex >= lastPhase) return;
    const id = setTimeout(() => setPhaseIndex((i) => i + 1), PHASE_MS);
    return () => clearTimeout(id);
  }, [failed, phaseIndex, lastPhase]);

  useEffect(() => {
    if (failed)
      AccessibilityInfo.announceForAccessibility(
        t('account.auth.applying.error'),
      );
  }, [failed, t]);

  return (
    <View className="flex-1">
      <StatusBar style="light" />
      <LinearGradient
        colors={[fixedColors.forestTop, fixedColors.forestBot]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <RingPattern
        width={width}
        height={height}
        opacity={0.06}
        scale={0.7}
        color={fixedColors.lime}
        style={StyleSheet.absoluteFill}
      />
      <View
        className="flex-1 items-center justify-center gap-6 px-8"
        style={{
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={failed ? t('account.auth.applying.error') : phase}
          className="items-center gap-5"
        >
          <TideLoader size={140} state={failed ? 'error' : 'loading'} />
          {failed ? null : (
            <Animated.Text
              key={phase}
              entering={FadeIn.duration(duration.base).reduceMotion(REDUCE)}
              exiting={FadeOut.duration(exit(duration.fast)).reduceMotion(
                REDUCE,
              )}
              maxFontSizeMultiplier={maxFontSizeMultiplier.text}
              className="text-center text-[15px] leading-5 text-hero-label-2"
            >
              {phase}
            </Animated.Text>
          )}
        </View>

        {failed ? (
          <Animated.View
            entering={FadeIn.duration(duration.base).reduceMotion(REDUCE)}
            className="w-full items-center gap-4"
          >
            <Text
              maxFontSizeMultiplier={maxFontSizeMultiplier.text}
              className="text-center text-[17px] leading-6 text-hero-label"
            >
              {t('account.auth.applying.error')}
            </Text>
            <View className="w-full pt-2">
              <GlassButton
                label={t('account.auth.applying.retry')}
                onPress={onRetry}
              />
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('account.auth.applying.signOut')}
              preset="subtle"
              hitSlop={12}
              onPress={onSignOut}
              style={{
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                maxFontSizeMultiplier={maxFontSizeMultiplier.text}
                className="text-[15px] font-semibold text-hero-label-2"
              >
                {t('account.auth.applying.signOut')}
              </Text>
            </PressableScale>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}
