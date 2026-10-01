import { Stack } from 'expo-router';

export default function TodayStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerLargeTitle: false }} />
    </Stack>
  );
}
