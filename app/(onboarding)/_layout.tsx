import { Stack } from 'expo-router';

/**
 * Native Stack with a transparent, title-less header: each screen draws its
 * own big title inside `OnboardingScreen` (so the CTA can be pinned below);
 * the header only provides the native glass back button + safe-area inset.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
