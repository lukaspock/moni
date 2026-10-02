import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TrainingStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* Plain push page (not a formSheet): sheets inside a tab's nested stack
          rendered blank/collapsed on device. */}
      <Stack.Screen
        name="routine-editor"
        options={{
          headerShown: true,
          title: t('workout.routine.title'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
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
