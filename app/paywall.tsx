import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Illustration } from '@/components/brand';
import { Reveal } from '@/components/motion';
import { Card, GlassActionButton, SheetScreen } from '@/components/ui';

/**
 * Phase 7 will replace this with a real RevenueCat paywall
 * (`react-native-purchases-ui`, PLAN §7.10). For now this is only the
 * "daily AI limit reached" placeholder the `food` flow navigates to on a
 * 402 from `analyze-food` (PLAN §7.3). Presented as a sheet (registered in
 * `app/_layout.tsx`).
 */
export default function PaywallScreen() {
  const { t } = useTranslation();

  return (
    <SheetScreen title={t('food.paywall.title')}>
      <Reveal>
        <Card className="items-center gap-3 p-6">
          <View className="items-center">
            <Illustration name="goalReached" size={160} />
          </View>
          <Text className="text-label-secondary text-center text-base">
            {t('food.paywall.body')}
          </Text>
        </Card>
      </Reveal>
      <GlassActionButton
        label={t('food.paywall.close')}
        symbol="checkmark"
        onPress={() => router.back()}
      />
    </SheetScreen>
  );
}
