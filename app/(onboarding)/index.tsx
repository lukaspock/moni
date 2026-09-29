import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboardingStore, useSession } from '@/features/auth';
import { GlassButton } from '@/features/auth/components/GlassButton';
import type { SFSymbol } from '@/features/auth/components/OptionCard';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';
import { themeColor } from '@/theme/colors';

function ValueProp({ symbol, title, body, index }: { symbol: SFSymbol; title: string; body: string; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(350 + index * 90)}
      className="flex-row items-center gap-4 rounded-2xl bg-secondary-system-background px-4 py-3.5"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-system-background">
        <SymbolView name={symbol} size={22} type="hierarchical" tintColor={themeColor('accent')} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-label">{title}</Text>
        <Text className="text-sm text-secondary-label">{body}</Text>
      </View>
    </Animated.View>
  );
}

/** Animated hero: a softly "breathing" mint badge with the app's flame/leaf mark. */
function Hero() {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1400 }), withTiming(1, { duration: 1400 })),
      -1,
      false,
    );
  }, [pulse, reduceMotion]);

  const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View entering={ZoomIn.duration(300)} className="items-center justify-center">
      <Animated.View style={haloStyle} className="h-32 w-32 items-center justify-center rounded-full bg-secondary-system-background">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-tint">
          <SymbolView name="leaf.fill" size={46} tintColor="white" />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const setWantsSignIn = useOnboardingStore((s) => s.setWantsSignIn);
  const { session } = useSession();
  const { goNext } = useOnboardingNavigation('welcome');

  function handleHaveAccount() {
    // Flips the gate guard (onboarding → auth); sign-in opens in "sign in" mode.
    setWantsSignIn(true);
    router.replace('/(auth)/sign-in');
  }

  return (
    <ScrollView
      className="flex-1 bg-system-background"
      contentContainerClassName="justify-between px-6"
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 32, paddingBottom: Math.max(insets.bottom, 16) }}
      bounces={false}
    >
      <View className="gap-7">
        <Hero />
        <Animated.View entering={FadeInUp.duration(300).delay(150)} className="items-center gap-2">
          <Text className="text-sm font-semibold uppercase tracking-widest text-tint">
            {t('account.onboarding.welcome.eyebrow')}
          </Text>
          <Text className="text-center text-3xl font-bold text-label">{t('account.onboarding.welcome.title')}</Text>
          <Text className="text-center text-base leading-6 text-secondary-label">
            {t('account.onboarding.welcome.subtitle')}
          </Text>
        </Animated.View>
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
      <Animated.View entering={FadeInUp.duration(300).delay(650)} className="gap-3 pt-6">
        <GlassButton label={t('account.onboarding.welcome.cta')} onPress={() => goNext()} />
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
  );
}
