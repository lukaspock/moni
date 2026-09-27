import '../global.css';
import '../src/i18n';
// Starts the offline outbox (NetInfo + foreground triggers) at app launch.
import '../src/lib/outbox';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useOnboardingStore, useSession } from '../src/features/auth';

const queryClient = new QueryClient();

/**
 * Auth gate (Sprint 1, `account`): no session & onboarding not finished ->
 * (onboarding); onboarding finished but no session -> (auth)/sign-in;
 * session -> (tabs). `Stack.Protected` (expo-router ~57) swaps the branch
 * declaratively instead of imperative redirects.
 */
function RootNavigator() {
  const { session, isLoading: sessionLoading } = useSession();
  const onboardingCompleted = useOnboardingStore((s) => s.completed);

  if (sessionLoading) {
    // Avoid flashing (onboarding) or (auth) before we know if a session exists.
    return null;
  }

  const hasSession = !!session;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={hasSession}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!hasSession && !onboardingCompleted}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!hasSession && onboardingCompleted}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="log-food"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.5, 1],
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen
        name="barcode-scanner"
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="food-review"
        options={{ presentation: 'modal', headerShown: true }}
      />
      <Stack.Screen
        name="exercise-picker"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.75, 1],
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen
        name="workout"
        options={{ presentation: 'fullScreenModal' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
