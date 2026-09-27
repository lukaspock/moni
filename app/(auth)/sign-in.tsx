import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  applyOnboardingDraftToProfile,
  isAuthError,
  sendEmailOtp,
  signInWithPassword,
  signUpWithPassword,
  verifyEmailOtp,
} from '@/features/auth';
import { GlassButton } from '@/features/auth/components/GlassButton';

type Mode = 'password' | 'otp';

export default function SignInScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('password');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function friendlyError(err: unknown): string {
    if (isAuthError(err) || err instanceof Error) {
      return err.message;
    }
    return t('account.auth.signIn.errors.generic');
  }

  async function afterSignedIn(userId: string | null) {
    if (userId) {
      await applyOnboardingDraftToProfile(userId);
    }
    // No explicit navigation: the root gate in app/_layout.tsx reacts to the
    // new session and swaps in (tabs) automatically.
  }

  async function handlePasswordSubmit() {
    if (!email.trim()) {
      setError(t('account.auth.signIn.errors.missingEmail'));
      return;
    }
    if (!password) {
      setError(t('account.auth.signIn.errors.missingPassword'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const userId = isSignUp ? await signUpWithPassword(email.trim(), password) : await signInWithPassword(email.trim(), password);
      await afterSignedIn(userId);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (!email.trim()) {
      setError(t('account.auth.signIn.errors.missingEmail'));
      return;
    }
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
    if (otpCode.trim().length < 6) {
      setError(t('account.auth.signIn.errors.invalidCode'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const userId = await verifyEmailOtp(email.trim(), otpCode.trim());
      await afterSignedIn(userId);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-system-background"
    >
      <ScrollView
        contentContainerClassName="gap-6 px-6 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text className="text-3xl font-bold text-label">{t('account.auth.signIn.title')}</Text>
          <Text className="text-base text-secondary-label">{t('account.auth.signIn.subtitle')}</Text>
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t('account.auth.signIn.emailLabel')}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          className="h-14 rounded-xl border border-separator px-4 text-lg text-label"
        />

        {mode === 'password' ? (
          <View className="gap-4">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('account.auth.signIn.passwordLabel')}
              secureTextEntry
              autoComplete="password"
              className="h-14 rounded-xl border border-separator px-4 text-lg text-label"
            />

            {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

            <GlassButton
              label={t(isSignUp ? 'account.auth.signIn.signUpCta' : 'account.auth.signIn.signInCta')}
              onPress={handlePasswordSubmit}
              loading={loading}
            />

            <Pressable onPress={() => setIsSignUp((v) => !v)} className="items-center py-2">
              <Text className="text-sm text-tint">
                {t(isSignUp ? 'account.auth.signIn.toggleToSignIn' : 'account.auth.signIn.toggleToSignUp')}
              </Text>
            </Pressable>
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
                  maxLength={6}
                  className="h-14 rounded-xl border border-separator px-4 text-center text-2xl tracking-widest text-label"
                />
                {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
                <GlassButton label={t('account.auth.signIn.otp.verifyCta')} onPress={handleVerifyOtp} loading={loading} />
                <Pressable onPress={handleSendOtp} className="items-center py-2">
                  <Text className="text-sm text-tint">{t('account.auth.signIn.otp.resendCta')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
                <GlassButton label={t('account.auth.signIn.otp.sendCta')} onPress={handleSendOtp} loading={loading} />
              </>
            )}
          </View>
        )}

        <Pressable onPress={() => setMode((m) => (m === 'password' ? 'otp' : 'password'))} className="items-center py-2">
          <Text className="text-sm text-secondary-label">
            {t('account.auth.signIn.orDivider')} · {t(mode === 'password' ? 'account.auth.signIn.otp.title' : 'account.auth.signIn.signInCta')}
          </Text>
        </Pressable>

        <View className="mt-4 gap-3 border-t border-separator pt-6">
          <Pressable disabled className="h-14 items-center justify-center rounded-xl border border-separator opacity-40">
            <Text className="text-base font-medium text-label">{t('account.auth.signIn.appleCta')}</Text>
          </Pressable>
          <Pressable disabled className="h-14 items-center justify-center rounded-xl border border-separator opacity-40">
            <Text className="text-base font-medium text-label">{t('account.auth.signIn.googleCta')}</Text>
          </Pressable>
          <Text className="text-center text-xs text-tertiary-label">{t('account.auth.signIn.socialComingSoon')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
