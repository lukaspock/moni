import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ProfileStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false, title: t('profile.title') }}
      />
      <Stack.Screen
        name="goals"
        options={{ title: t('account.profile.rows.goals') }}
      />
      <Stack.Screen
        name="body"
        options={{ title: t('account.profile.rows.body') }}
      />
      <Stack.Screen name="rhythm" options={{ title: t('rhythm.title') }} />
      <Stack.Screen
        name="settings"
        options={{ title: t('account.profile.rows.settings') }}
      />
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
