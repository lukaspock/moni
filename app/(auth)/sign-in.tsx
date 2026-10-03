import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  isAuthError,
  sendEmailOtp,
  signInWithPassword,
  signUpWithPassword,
  useOnboardingStore,
  verifyEmailOtp,
} from '@/features/auth';
import { GlassButton } from '@/features/auth/components/GlassButton';

type Mode = 'signUp' | 'signIn';
type Method = 'password' | 'otp';

const inputClass = 'h-14 rounded-2xl border border-separator bg-secondary-system-background px-4 text-lg text-label';

/**
 * Sign-up is the default after onboarding ("Almost there, {name}!"); a
 * clearly visible secondary button switches to sign-in and back. Returning
 * users who came from Welcome's "I already have an account" land in sign-in
 * mode, with a way back into the setup flow.
 *
 * No navigation or profile writes here: once a session exists, the gate in
 * `app/_layout.tsx` applies the onboarding draft (if any, never over an
 * existing profile) and swaps in (tabs) — or (onboarding) for a brand-new
 * account without answers.
 */
export default function SignInScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const completed = useOnboardingStore((s) => s.completed);
  const name = useOnboardingStore((s) => s.draft.displayName.trim());
  const setWantsSignIn = useOnboardingStore((s) => s.setWantsSignIn);

  const [mode, setMode] = useState<Mode>(() => (completed ? 'signUp' : 'signIn'));
  const [method, setMethod] = useState<Method>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === 'signUp';

  function friendlyError(err: unknown): string {
    if (isAuthError(err) || err instanceof Error) return err.message;
    return t('account.auth.signIn.errors.generic');
  }

  function switchMode(next: Mode) {
    setMode(next);
    setMethod('password');
    setError(null);
    setNotice(null);
    setOtpSent(false);
  }

  function backToSetup() {
    // Returning-user path, but they're actually new → back into the questionnaire.
    setWantsSignIn(false);
    router.replace('/(onboarding)');
  }

  async function handlePasswordSubmit() {
    if (!email.trim()) return setError(t('account.auth.signIn.errors.missingEmail'));
    if (!password) return setError(t('account.auth.signIn.errors.missingPassword'));
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const { needsEmailConfirmation } = await signUpWithPassword(email.trim(), password);
        if (needsEmailConfirmation) {
          setMode('signIn');
          setNotice(t('account.auth.signIn.checkEmail'));
        }
      } else {
        await signInWithPassword(email.trim(), password);
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (!email.trim()) return setError(t('account.auth.signIn.errors.missingEmail'));
    setError(null);
    setLoading(true);
    try {
      await sendEmailOtp(email.trim());
      setOtpSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.trim().length < 6) return setError(t('account.auth.signIn.errors.invalidCode'));
    setError(null);
    setLoading(true);
    try {
      await verifyEmailOtp(email.trim(), otpCode.trim());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  const title = isSignUp
    ? name
      ? t('account.auth.signIn.signUpTitle', { name })
      : t('account.auth.signIn.signUpTitleNoName')
    : t('account.auth.signIn.signInTitle');
  const subtitle = isSignUp ? t('account.auth.signIn.signUpSubtitle') : t('account.auth.signIn.signInSubtitle');

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-system-background">
      <ScrollView
        contentContainerClassName="gap-5 px-6"
        contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Animated.View key={mode} entering={FadeInDown.duration(250)} className="gap-2 pb-2">
          <Text className="text-3xl font-bold text-label">{title}</Text>
          <Text className="text-base leading-6 text-secondary-label">{subtitle}</Text>
        </Animated.View>

        {notice ? (
          <Animated.View entering={FadeIn.duration(200)} className="rounded-2xl bg-secondary-system-background p-4">
            <Text className="text-sm text-label">{notice}</Text>
          </Animated.View>
        ) : null}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t('account.auth.signIn.emailLabel')}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType="next"
          className={inputClass}
        />

        {method === 'password' ? (
          <View className="gap-4">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('account.auth.signIn.passwordLabel')}
              secureTextEntry
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              textContentType={isSignUp ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={handlePasswordSubmit}
              className={inputClass}
            />
            {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
            <GlassButton
              label={t(isSignUp ? 'account.auth.signIn.signUpCta' : 'account.auth.signIn.signInCta')}
              onPress={handlePasswordSubmit}
              loading={loading}
            />
          </View>
        ) : (
          <View className="gap-4">
            {otpSent ? (
              <>
                <Text className="text-sm text-secondary-label">{t('account.auth.signIn.otp.codeSentTo', { email })}</Text>
                <TextInput
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder={t('account.auth.signIn.otp.codeLabel')}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className={`${inputClass} text-center text-2xl tracking-widest`}
                />
                {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
                <GlassButton label={t('account.auth.signIn.otp.verifyCta')} onPress={handleVerifyOtp} loading={loading} />
                <Pressable onPress={handleSendOtp} className="items-center py-2">
                  <Text className="text-sm font-medium text-tint">{t('account.auth.signIn.otp.resendCta')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-sm text-secondary-label">{t('account.auth.signIn.otp.subtitle')}</Text>
                {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
                <GlassButton label={t('account.auth.signIn.otp.sendCta')} onPress={handleSendOtp} loading={loading} />
              </>
            )}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setError(null);
            setOtpSent(false);
            setMethod((m) => (m === 'password' ? 'otp' : 'password'));
          }}
          className="items-center py-1"
        >
          <Text className="text-sm font-medium text-tint">
            {method === 'password' ? t('account.auth.signIn.otp.title') : t('account.auth.signIn.usePassword')}
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-3 py-1">
          <View className="h-px flex-1 bg-separator" />
          <Text className="text-sm text-secondary-label">{t('account.auth.signIn.orDivider')}</Text>
          <View className="h-px flex-1 bg-separator" />
        </View>

        {isSignUp ? (
          <GlassButton
            variant="secondary"
            label={t('account.auth.signIn.haveAccount')}
            onPress={() => switchMode('signIn')}
          />
        ) : completed ? (
          <GlassButton
            variant="secondary"
            label={t('account.auth.signIn.createInstead')}
            onPress={() => switchMode('signUp')}
          />
        ) : (
          <GlassButton variant="secondary" label={t('account.auth.signIn.newHere')} onPress={backToSetup} />
        )}

        <View className="mt-2 gap-3">
          <Pressable disabled className="h-14 items-center justify-center rounded-2xl border border-separator opacity-40">
            <Text className="text-base font-medium text-label">{t('account.auth.signIn.appleCta')}</Text>
          </Pressable>
          <Pressable disabled className="h-14 items-center justify-center rounded-2xl border border-separator opacity-40">
            <Text className="text-base font-medium text-label">{t('account.auth.signIn.googleCta')}</Text>
          </Pressable>
          <Text className="text-center text-xs text-tertiary-label">{t('account.auth.signIn.socialComingSoon')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
