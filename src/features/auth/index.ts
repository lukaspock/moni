// CONTRACT (owner: `account` agent). Signatures are fixed, implementation is replaced.
import { useEffect, useState } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabase';

export type SessionState = {
  session: Session | null;
  userId: string | null;
  isLoading: boolean;
};

/** Current Supabase auth session (reactive). */
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        setIsLoading(false);
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, userId: session?.user.id ?? null, isLoading };
}

/** Signs the current user out (clears the MMKV-persisted Supabase session). */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// --- Additional auth actions used by app/(auth)/sign-in.tsx --------------
// Not part of the fixed useSession/signOut contract; free to extend.

/**
 * `needsEmailConfirmation` = the project requires confirming the email first
 * (Supabase returns a user but no session) — the caller should say so and
 * switch to sign-in.
 */
export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<{ userId: string | null; needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return {
    userId: data.user?.id ?? null,
    needsEmailConfirmation: !!data.user && !data.session,
  };
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<string | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user?.id ?? null;
}

/** Sends a 6-digit one-time code to `email` (works without deep links, unlike a magic link). */
export async function sendEmailOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(
  email: string,
  token: string,
): Promise<string | null> {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;
  return data.user?.id ?? null;
}

/** True for Supabase auth errors, so callers can map `error.message` to a translated string. */
export function isAuthError(error: unknown): error is AuthError {
  return (
    !!error &&
    typeof error === 'object' &&
    'status' in (error as object) &&
    'message' in (error as object)
  );
}

export {
  useOnboardingStore,
  isDraftComplete,
  type OnboardingDraft,
} from './onboardingStore';
export {
  applyOnboardingDraftToProfile,
  type ApplyDraftResult,
} from './applyOnboardingDraft';
export { isProfileComplete } from './profileStatus';
export { formatWeight, greetingPeriod, type GreetingPeriod } from './format';
