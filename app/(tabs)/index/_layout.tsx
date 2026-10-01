import { Stack } from 'expo-router';

// No native header on Today: the day title is a fixed row rendered by the screen itself
// (solid page background, no glass capsule), so nothing scrolls under it.
export default function TodayStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
