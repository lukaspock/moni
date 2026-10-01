import { Stack } from 'expo-router';

// Day title is rendered left-aligned by the screen (headerLeft) on a transparent header;
// the iOS 26 soft scroll edge effect fades content under it instead of drawing a bar.
export default function TodayStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitle: false,
        headerBackground: () => null,
        scrollEdgeEffects: {
          top: 'soft',
          bottom: 'automatic',
          left: 'automatic',
          right: 'automatic',
        },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
