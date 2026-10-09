import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lockup, LogoMark, RingPattern } from '@/components/brand';
import { Reveal } from '@/components/motion';
import { useOnboardingStore, useSession } from '@/features/auth';
import { GlassButton } from '@/features/auth/components/GlassButton';
import type { SFSymbol } from '@/features/auth/components/OptionCard';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';
import { themeColor } from '@/theme/colors';

function ValueProp({
  symbol,
  title,
  body,
  index,
}: {
  symbol: SFSymbol;
  title: string;
  body: string;
  index: number;
}) {
  return (
    <Reveal index={index} delay={700}>
      <View
        accessible
        accessibilityLabel={`${title}. ${body}`}
        className="bg-surface flex-row items-center gap-4 rounded-[20px] px-4 py-3.5"
      >
        <View className="bg-tint-soft h-10 w-10 items-center justify-center rounded-xl">
          <SymbolView
            name={symbol}
            size={22}
            type="hierarchical"
            tintColor={themeColor('accent')}
          />
        </View>
        <View className="flex-1">
          <Text className="text-label text-base font-semibold">{title}</Text>
          <Text className="text-label-secondary text-sm">{body}</Text>
        </View>
      </View>
    </Reveal>
  );
}

/**
 * Branding moment 1: the mark surfaces calmly (fade + settle, then a slow
 * breath), the lockup follows. Reduce Motion: static mark.
 */
function Hero() {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1800 }),
          withTiming(1, { duration: 1800 }),
        ),
        -1,
        false,
      ),
    );
  }, [pulse, reduceMotion]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View className="items-center gap-4">
      <Reveal rise={14} duration={520}>
        <Animated.View style={markStyle}>
          <LogoMark size={108} variant="adaptive" decorative />
        </Animated.View>
      </Reveal>
      <Reveal delay={260} rise={10}>
        <Lockup width={132} />
      </Reveal>
    </View>
  );
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const setWantsSignIn = useOnboardingStore((s) => s.setWantsSignIn);
  const { session } = useSession();
  const { goNext } = useOnboardingNavigation('welcome');

  function handleHaveAccount() {
    // Flips the gate guard (onboarding → auth); sign-in opens in "sign in" mode.
    setWantsSignIn(true);
    router.replace('/(auth)/sign-in');
  }

  return (
    <View className="bg-bg flex-1">
      <RingPattern
        width={width}
        height={height}
        opacity={0.1}
        scale={1.15}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <ScrollView
        contentContainerClassName="justify-between px-6"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 40,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
        bounces={false}
      >
        <View className="gap-8">
          <Hero />
          <Reveal delay={420}>
            <View className="items-center gap-2">
              <Text className="text-tint text-xs font-semibold uppercase tracking-widest">
                {t('account.onboarding.welcome.eyebrow')}
              </Text>
              <Text
                accessibilityRole="header"
                className="text-label text-center font-display-black text-[34px] leading-[36px] tracking-tight"
              >
                {t('account.onboarding.welcome.title')}
              </Text>
              <Text className="text-label-secondary text-center text-[15px] leading-5">
                {t('account.onboarding.welcome.subtitle')}
              </Text>
            </View>
          </Reveal>
          <View className="gap-2.5">
            <ValueProp
              index={0}
              symbol="camera.viewfinder"
              title={t('account.onboarding.welcome.value1Title')}
              body={t('account.onboarding.welcome.value1Body')}
            />
            <ValueProp
              index={1}
              symbol="flame.fill"
              title={t('account.onboarding.welcome.value2Title')}
              body={t('account.onboarding.welcome.value2Body')}
            />
            <ValueProp
              index={2}
              symbol="chart.line.uptrend.xyaxis"
              title={t('account.onboarding.welcome.value3Title')}
              body={t('account.onboarding.welcome.value3Body')}
            />
          </View>
        </View>
        <Animated.View
          entering={FadeInUp.duration(300).delay(1000)}
          className="gap-3 pt-6"
        >
          <GlassButton
            label={t('account.onboarding.welcome.cta')}
            onPress={() => goNext()}
          />
          {/* Already signed in (new account without a profile) → nothing to sign in to. */}
          {session ? null : (
            <GlassButton
              variant="secondary"
              label={t('account.onboarding.welcome.haveAccount')}
              onPress={handleHaveAccount}
            />
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
