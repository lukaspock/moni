import { Button, Host } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, frame } from '@expo/ui/swift-ui/modifiers';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-system-background px-8">
      <Text className="text-center text-4xl font-bold text-label">{t('account.onboarding.welcome.title')}</Text>
      <Text className="text-center text-base text-secondary-label">{t('account.onboarding.welcome.subtitle')}</Text>
      <Host style={{ height: 56, width: '100%', marginTop: 24 }}>
        <Button
          label={t('account.onboarding.welcome.cta')}
          onPress={() => router.push('/(onboarding)/sex')}
          modifiers={[buttonStyle('glassProminent'), controlSize('large'), frame({ height: 56 })]}
        />
      </Host>
    </View>
  );
}
