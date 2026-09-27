import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TodayStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: t('today.title'), headerLargeTitle: true }}
      />
    </Stack>
  );
}
