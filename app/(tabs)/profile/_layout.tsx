import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ProfileStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="health"
        options={{ title: t('health.settings.title') }}
      />
      <Stack.Screen
        name="achievements"
        options={{ title: t('achievements.shelf.title') }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: t('rhythm.profile.notificationsRow') }}
      />
    </Stack>
  );
}
