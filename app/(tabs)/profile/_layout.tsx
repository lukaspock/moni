import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ProfileStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: t('profile.title'), headerLargeTitle: false }}
      />
      <Stack.Screen
        name="health"
        options={{ title: t('health.settings.title') }}
      />
    </Stack>
  );
}
