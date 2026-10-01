import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Card, GlassActionButton, SheetScreen } from '@/components/ui';
import { themeColor } from '@/theme/colors';

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
      <Card className="items-center gap-3 p-6">
        <SymbolView
          name="sparkles"
          size={40}
          tintColor={themeColor('accent')}
        />
        <Text className="text-secondary-label text-center text-base">
          {t('food.paywall.body')}
        </Text>
      </Card>
      <GlassActionButton
        label={t('food.paywall.close')}
        symbol="checkmark"
        onPress={() => router.back()}
      />
    </SheetScreen>
  );
}
