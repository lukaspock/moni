import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { GlassButton } from '@/features/auth/components/GlassButton';

export default function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-system-background px-8">
      <Text className="text-center text-4xl font-bold text-label">{t('account.onboarding.welcome.title')}</Text>
      <Text className="text-center text-base text-secondary-label">{t('account.onboarding.welcome.subtitle')}</Text>
      <View className="mt-6 w-full">
        <GlassButton label={t('account.onboarding.welcome.cta')} onPress={() => router.push('/(onboarding)/sex')} />
      </View>
    </View>
  );
}
