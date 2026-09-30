import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function InsightsStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: t('insights.title'), headerLargeTitle: true }}
      />
      <Stack.Screen
        name="weight-history"
        options={{ title: t('insights.history.title') }}
      />
      <Stack.Screen
        name="weight-entry"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.55, 1],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
    </Stack>
  );
}
