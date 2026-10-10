import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SHEET_OPTIONS } from '@/components/ui';

export default function InsightsStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="weight-history"
        options={{ title: t('insights.history.title') }}
      />
      <Stack.Screen name="weight-entry" options={SHEET_OPTIONS} />
      <Stack.Screen
        name="week"
        options={{ presentation: 'fullScreenModal', headerShown: false }}
      />
    </Stack>
  );
}
