import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Illustration, LogoMark } from '@/components/brand';
import { Reveal } from '@/components/motion';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';
import { useMealReminders } from '@/features/notifications';
import { fixedColors } from '@/theme/colors';
import { haptic } from '@/lib/haptics';

function PreviewBanner({
  title,
  body,
  index,
}: {
  title: string;
  body: string;
  index: number;
}) {
  const { t } = useTranslation();
  return (
    <Animated.View
      entering={FadeInUp.duration(300).delay(150 + index * 160)}
      className="bg-surface flex-row items-start gap-3 rounded-2xl p-3.5"
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: fixedColors.forest }}
      >
        <LogoMark size={24} variant="color" decorative />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row justify-between">
          <Text className="text-label-secondary text-xs font-semibold uppercase">
            {t('account.onboarding.notifications.previewApp')}
          </Text>
          <Text className="text-label-secondary text-xs">
            {t('account.onboarding.notifications.previewNow')}
          </Text>
        </View>
        <Text className="text-label text-base font-semibold">{title}</Text>
        <Text className="text-label text-sm">{body}</Text>
      </View>
    </Animated.View>
  );
}

/** Notification primer: preview what the reminders look like, then ask (skippable). Last step before sign-up. */
export default function NotificationsPrimerScreen() {
  const { t } = useTranslation();
  const { setEnabled } = useMealReminders();
  const { goNext } = useOnboardingNavigation('notifications');
  const [busy, setBusy] = useState(false);

  async function enable() {
    setBusy(true);
    try {
      const enabled = await setEnabled(true);
      if (enabled) haptic.onboardResult();
    } catch (error) {
      console.warn('[onboarding] enabling reminders failed', error);
    } finally {
      setBusy(false);
      goNext();
    }
  }

  return (
    <OnboardingScreen
      title={t('account.onboarding.notifications.title')}
      subtitle={t('account.onboarding.notifications.subtitle')}
      continueLabel={t('account.onboarding.notifications.cta')}
      onContinue={enable}
      continueLoading={busy}
      secondaryLabel={t('account.onboarding.notifications.later')}
      onSecondary={() => goNext()}
    >
      <Reveal>
        <View className="items-center py-2">
          <Illustration name="notifications" size={200} />
        </View>
      </Reveal>
      <View className="gap-2.5">
        <PreviewBanner
          index={0}
          title={t('notifications.meal.lunch.title')}
          body={t('notifications.meal.lunch.body')}
        />
        <PreviewBanner
          index={1}
          title={t('notifications.meal.dinner.title')}
          body={t('notifications.meal.dinner.body')}
        />
      </View>
    </OnboardingScreen>
  );
}
