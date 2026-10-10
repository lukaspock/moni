import '../global.css';
import '../src/i18n';
// Starts the offline outbox (NetInfo + foreground triggers) at app launch.
import '../src/lib/outbox';

import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  FULL_SHEET_OPTIONS,
  LaunchScreen,
  rememberDisplayName,
  SHEET_OPTIONS,
} from '../src/components/ui';
import {
  applyOnboardingDraftToProfile,
  isDraftComplete,
  isProfileComplete,
  signOut,
  useOnboardingStore,
  useSession,
} from '../src/features/auth';
import { ApplyingProfileScreen } from '../src/features/auth/components/ApplyingProfileScreen';
import { initNotifications } from '../src/features/notifications';
import { useProfile } from '../src/features/targets';

// Keep the native splash up until the display font is ready (see RootLayout).
void SplashScreen.preventAutoHideAsync().catch(() => {});

// Foreground notification handler + re-localizing reminders on language change.
initNotifications();

const queryClient = new QueryClient();

type ApplyPhase = 'idle' | 'applying' | 'failed';

/**
 * Auth gate (`account` → `onboarding` v2). `Stack.Protected` (expo-router ~57)
 * swaps the branch declaratively instead of imperative redirects:
 *
 * - signed out, setup not finished, not "I already have an account" → (onboarding)
 * - signed out, setup finished OR returning user → (auth)/sign-in
 * - signed in + finished draft not yet written → write it (never over an
 *   existing complete profile — see `applyOnboardingDraftToProfile`), showing
 *   a small "setting up your plan" screen, then →
 * - signed in + complete profile → (tabs)
 * - signed in + no/incomplete profile and no draft to apply (new account via
 *   the returning-user path, or a second account on this device) → (onboarding)
 */
/** Max time the gate waits for the profile before falling back to the tabs. */
const PROFILE_GATE_TIMEOUT_MS = 2500;

function RootNavigator() {
  const client = useQueryClient();
  const { session, userId, isLoading: sessionLoading } = useSession();
  const {
    profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useProfile();
  const onboardingCompleted = useOnboardingStore((s) => s.completed);
  const wantsSignIn = useOnboardingStore((s) => s.wantsSignIn);
  const appliedToProfile = useOnboardingStore((s) => s.appliedToProfile);
  const draftComplete = useOnboardingStore((s) => isDraftComplete(s.draft));

  const [applyPhase, setApplyPhase] = useState<ApplyPhase>('idle');
  const [applyAttempt, setApplyAttempt] = useState(0);

  const hasSession = !!session;

  // Cache the name for the personalised launch screen of the next cold start.
  useEffect(() => {
    rememberDisplayName(profile?.display_name);
  }, [profile?.display_name]);

  // Offline cold start: a hanging profile fetch must not keep the gate on a
  // spinner — after PROFILE_GATE_TIMEOUT_MS fall back like a failed fetch.
  const [profileTimedOut, setProfileTimedOut] = useState(false);
  const waitingOnProfile = hasSession && profileLoading;
  useEffect(() => {
    if (!waitingOnProfile) return;
    const timer = setTimeout(
      () => setProfileTimedOut(true),
      PROFILE_GATE_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [waitingOnProfile]);
  const profileGaveUp = waitingOnProfile && profileTimedOut;

  const draftReady = onboardingCompleted && !appliedToProfile && draftComplete;

  useEffect(() => {
    if (!userId || !draftReady) return;
    let cancelled = false;
    const run = async () => {
      setApplyPhase('applying');
      try {
        await applyOnboardingDraftToProfile(userId);
        // Keep the "applying" screen up until the fresh profile is in the cache,
        // otherwise the gate would briefly see "no profile" and flash onboarding.
        await client.refetchQueries({ queryKey: ['profile', userId] });
        void client.invalidateQueries();
        if (!cancelled) setApplyPhase('idle');
      } catch (error) {
        console.warn('[gate] applying onboarding draft failed', error);
        if (!cancelled) setApplyPhase('failed');
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, draftReady, applyAttempt, client]);

  if (sessionLoading || (waitingOnProfile && !profileGaveUp)) {
    // Avoid flashing (onboarding) or (auth) before we know where the user belongs.
    // `useProfile` retries only once, so an offline start falls through to the tabs quickly.
    return <LaunchScreen />;
  }

  // Profile fetch failed (e.g. offline cold start): don't bounce an existing
  // user into onboarding — fall back to the tabs like before v2.
  const profileComplete =
    isProfileComplete(profile) ||
    ((profileError || profileGaveUp) && !profile && !draftReady);

  if (hasSession && !profileComplete && (draftReady || applyPhase !== 'idle')) {
    return (
      <ApplyingProfileScreen
        failed={applyPhase === 'failed'}
        onRetry={() => setApplyAttempt((n) => n + 1)}
        onSignOut={() => {
          setApplyPhase('idle');
          void signOut();
        }}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={hasSession && profileComplete}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected
        guard={
          (!hasSession && !onboardingCompleted && !wantsSignIn) ||
          (hasSession && !profileComplete)
        }
      >
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected
        guard={!hasSession && (onboardingCompleted || wantsSignIn)}
      >
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="paywall" options={SHEET_OPTIONS} />
      <Stack.Screen
        name="log-food"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.75, 1],
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen
        name="barcode-scanner"
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="food-review" options={FULL_SHEET_OPTIONS} />
      <Stack.Screen name="voice-log" options={SHEET_OPTIONS} />
      <Stack.Screen name="recipe-editor" options={FULL_SHEET_OPTIONS} />
      {/* Outside the tabs: no tab bar over the save/add buttons, no native header. */}
      <Stack.Screen
        name="routine-editor"
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      <Stack.Screen
        name="training-setup"
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      {/* Stays full screen (no drag-to-dismiss) so a running workout can't be swiped away. */}
      <Stack.Screen
        name="workout"
        options={{ presentation: 'fullScreenModal' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  // Display font (Bricolage Grotesque). Names = font-display* tokens in tailwind.config.js.
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  const fontsReady = fontsLoaded || !!fontError;
  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);
  if (!fontsReady) return null;

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
