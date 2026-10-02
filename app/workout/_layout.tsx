import { Stack } from 'expo-router';

/**
 * Nested stack for the `workout` fullScreenModal route registered in the
 * root `app/_layout.tsx`. `active` is the live session, `summary` shows the
 * result after finishing — both headerless, the screens build their own
 * native-glass chrome.
 */
export default function WorkoutStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="active"
        options={{ gestureEnabled: false, fullScreenGestureEnabled: false }}
      />
      <Stack.Screen
        name="summary"
        options={{ gestureEnabled: false, fullScreenGestureEnabled: false }}
      />
    </Stack>
  );
}
