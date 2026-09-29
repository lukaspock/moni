import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';
import { useMealReminders } from '@/features/notifications';
import { themeColor } from '@/theme/colors';

function PreviewBanner({ title, body, index }: { title: string; body: string; index: number }) {
  const { t } = useTranslation();
  return (
    <Animated.View
      entering={FadeInUp.duration(300).delay(150 + index * 160)}
      className="flex-row items-start gap-3 rounded-2xl bg-secondary-system-background p-3.5"
    >
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-tint">
        <SymbolView name="leaf.fill" size={18} tintColor="white" />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row justify-between">
          <Text className="text-xs font-semibold uppercase text-secondary-label">
            {t('account.onboarding.notifications.previewApp')}
          </Text>
          <Text className="text-xs text-secondary-label">{t('account.onboarding.notifications.previewNow')}</Text>
        </View>
        <Text className="text-base font-semibold text-label">{title}</Text>
        <Text className="text-sm text-label">{body}</Text>
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
      if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      <Animated.View entering={FadeInDown.duration(260)} className="items-center py-2">
        <SymbolView
          name="bell.badge.fill"
          size={56}
          type="hierarchical"
          tintColor={themeColor('accent')}
          animationSpec={{ effect: { type: 'bounce' }, repeating: false }}
        />
      </Animated.View>
      <View className="gap-2.5">
        <PreviewBanner index={0} title={t('notifications.meal.lunch.title')} body={t('notifications.meal.lunch.body')} />
        <PreviewBanner index={1} title={t('notifications.meal.dinner.title')} body={t('notifications.meal.dinner.body')} />
      </View>
    </OnboardingScreen>
  );
}
