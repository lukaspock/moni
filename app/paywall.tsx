import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

/**
 * Phase 7 will replace this with a real RevenueCat paywall
 * (`react-native-purchases-ui`, PLAN §7.10). For now this is only the
 * "daily AI limit reached" placeholder the `food` flow navigates to on a
 * 402 from `analyze-food` (PLAN §7.3).
 */
export default function PaywallScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-system-background px-8">
      <SymbolView name="sparkles" size={40} />
      <Text className="text-center text-xl font-semibold text-label">
        {t('food.paywall.title')}
      </Text>
      <Text className="text-center text-base text-secondary-label">
        {t('food.paywall.body')}
      </Text>
      <Pressable
        onPress={() => router.back()}
        className="mt-4 items-center rounded-xl bg-tint px-6 py-3"
      >
        <Text className="text-base font-semibold text-white">{t('food.paywall.close')}</Text>
      </Pressable>
    </View>
  );
}
