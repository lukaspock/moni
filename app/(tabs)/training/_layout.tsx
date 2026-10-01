import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FULL_SHEET_OPTIONS } from '@/components/ui';

export default function TrainingStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="routine-editor" options={FULL_SHEET_OPTIONS} />
      <Stack.Screen
        name="history"
        options={{ headerShown: true, title: t('workout.history.title') }}
      />
      <Stack.Screen
        name="exercise/[id]"
        options={{ headerShown: true, title: t('workout.progress.title') }}
      />
    </Stack>
  );
}
