import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { GlassButton } from './GlassButton';

/**
 * Shown by the auth gate right after sign-up/sign-in while the onboarding
 * draft is written to the new account (usually < 1 s), or with a retry if
 * that failed (e.g. offline).
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

  return (
    <View className="flex-1 items-center justify-center gap-5 bg-system-background px-8">
      {failed ? (
        <Animated.View entering={FadeIn.duration(200)} className="w-full items-center gap-4">
          <Text className="text-center text-base text-label">{t('account.auth.applying.error')}</Text>
          <GlassButton label={t('account.auth.applying.retry')} onPress={onRetry} />
          <GlassButton variant="secondary" label={t('account.auth.applying.signOut')} onPress={onSignOut} />
        </Animated.View>
      ) : (
        <>
          <ActivityIndicator size="large" />
          <Text className="text-center text-base text-secondary-label">{t('account.auth.applying.title')}</Text>
        </>
      )}
    </View>
  );
}
