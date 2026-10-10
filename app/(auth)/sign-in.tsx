import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, Reveal } from '@/components/motion';
import { Chip } from '@/components/ui';
import {
  isAuthError,
  sendEmailOtp,
  signInWithPassword,
  signUpWithPassword,
  useOnboardingStore,
  verifyEmailOtp,
} from '@/features/auth';
import { AuthField } from '@/features/auth/components/AuthField';
import {
  AuthHero,
  useKeyboardProgress,
} from '@/features/auth/components/AuthHero';
import { FormMessage } from '@/features/auth/components/FormMessage';
import { GlassButton } from '@/features/auth/components/GlassButton';
import { OtpCodeField } from '@/features/auth/components/OtpCodeField';
import { SegmentToggle } from '@/features/auth/components/SegmentToggle';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';
import { maxFontSizeMultiplier } from '@/theme/typography';

type Mode = 'signUp' | 'signIn';
type Method = 'password' | 'otp';
type Field = 'email' | 'password' | 'code';

/**
 * Sign-up is the default after onboarding ("Almost there, {name}."); a
 * segment toggle switches to sign-in and back. Returning users who came from
 * Welcome's "I already have an account" land in sign-in mode, with a way back
 * into the setup flow.
 *
 * No navigation or profile writes here: once a session exists, the gate in
 * `app/_layout.tsx` applies the onboarding draft (if any, never over an
 * existing profile) and swaps in (tabs) — or (onboarding) for a brand-new
 * account without answers.
 */
export default function SignInScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardProgress();
  const completed = useOnboardingStore((s) => s.completed);
  const name = useOnboardingStore((s) => s.draft.displayName.trim());
  const setWantsSignIn = useOnboardingStore((s) => s.setWantsSignIn);

  const [mode, setMode] = useState<Mode>(() =>
    completed ? 'signUp' : 'signIn',
  );
  const [method, setMethod] = useState<Method>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<Field | null>(null);
  const [shakeTick, setShakeTick] = useState(0);

  const passwordRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);

  const isSignUp = mode === 'signUp';

  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(error);
  }, [error]);
  useEffect(() => {
    if (notice) AccessibilityInfo.announceForAccessibility(notice);
  }, [notice]);

  function friendlyError(err: unknown): string {
    if (isAuthError(err) || err instanceof Error) return err.message;
    return t('account.auth.signIn.errors.generic');
  }

  /** Shows an error line; `field` gets the red ring + a short shake. */
  function showError(message: string, field: Field | null = null) {
    setError(message);
    setErrorField(field);
    if (field) setShakeTick((n) => n + 1);
    haptic.validationError();
  }

  function clearError() {
    setError(null);
    setErrorField(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setMethod('password');
    clearError();
    setNotice(null);
    setOtpSent(false);
  }

  function switchMethod(next: Method) {
    if (next === method) return;
    clearError();
    setOtpSent(false);
    setMethod(next);
  }

  function backToSetup() {
    // Returning-user path, but they're actually new → back into the questionnaire.
    setWantsSignIn(false);
    router.replace('/(onboarding)');
  }

  async function handlePasswordSubmit() {
    if (!email.trim())
      return showError(t('account.auth.signIn.errors.missingEmail'), 'email');
    if (!password)
      return showError(
        t('account.auth.signIn.errors.missingPassword'),
        'password',
      );
    clearError();
    setNotice(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const { needsEmailConfirmation } = await signUpWithPassword(
          email.trim(),
          password,
        );
        haptic.accountCreated();
        if (needsEmailConfirmation) {
          setMode('signIn');
          setNotice(t('account.auth.signIn.checkEmail'));
        }
      } else {
        await signInWithPassword(email.trim(), password);
      }
    } catch (err) {
      showError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (!email.trim())
      return showError(t('account.auth.signIn.errors.missingEmail'), 'email');
    clearError();
    setLoading(true);
    try {
      await sendEmailOtp(email.trim());
      setOtpSent(true);
      requestAnimationFrame(() => codeRef.current?.focus());
    } catch (err) {
      showError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.trim().length < 6)
      return showError(t('account.auth.signIn.errors.invalidCode'), 'code');
    clearError();
    setLoading(true);
    try {
      await verifyEmailOtp(email.trim(), otpCode.trim());
    } catch (err) {
      showError(friendlyError(err), 'code');
    } finally {
      setLoading(false);
    }
  }

  function handleEmailSubmit() {
    if (method === 'password') passwordRef.current?.focus();
    else if (otpSent) codeRef.current?.focus();
    else void handleSendOtp();
  }

  const title = isSignUp
    ? name
      ? t('account.auth.signIn.headlineSignUp', { name })
      : t('account.auth.signIn.headlineSignUpNoName')
    : t('account.auth.signIn.headlineSignIn');
  const subtitle = isSignUp
    ? t('account.auth.signIn.signUpSubtitle')
    : t('account.auth.signIn.signInSubtitle');

  const primary =
    method === 'password'
      ? {
          label: t(
            isSignUp
              ? 'account.auth.signIn.signUpCta'
              : 'account.auth.signIn.signInCta',
          ),
          onPress: handlePasswordSubmit,
        }
      : otpSent
        ? {
            label: t('account.auth.signIn.otp.verifyCta'),
            onPress: handleVerifyOtp,
          }
        : {
            label: t('account.auth.signIn.otp.sendCta'),
            onPress: handleSendOtp,
          };

  return (
    <KeyboardAvoidingView behavior="padding" className="bg-bg flex-1">
      <StatusBar style="light" />
      <AuthHero keyboard={keyboard} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-6 pt-1"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 16,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Reveal key={mode} style={{ gap: 6 }}>
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={maxFontSizeMultiplier.title}
            className="text-label font-display-black text-[32px] leading-[36px] tracking-tight"
          >
            {title}
          </Text>
          <Text
            maxFontSizeMultiplier={maxFontSizeMultiplier.text}
            className="text-label-secondary text-base leading-6"
          >
            {subtitle}
          </Text>
        </Reveal>

        {completed ? (
          <Reveal index={1}>
            <SegmentToggle
              accessibilityLabel={t('account.auth.signIn.modeLabel')}
              value={mode}
              onChange={switchMode}
              options={[
                {
                  value: 'signUp',
                  label: t('account.auth.signIn.modeSignUp'),
                },
                {
                  value: 'signIn',
                  label: t('account.auth.signIn.modeSignIn'),
                },
              ]}
            />
          </Reveal>
        ) : null}

        {notice ? <FormMessage tone="notice" text={notice} /> : null}

        <Reveal index={2} style={{ gap: 12 }}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('account.auth.signIn.methodLabel')}
            className="flex-row items-center gap-2"
          >
            <Chip
              activeStyle="soft"
              symbol="lock"
              label={t('account.auth.signIn.methodPassword')}
              selected={method === 'password'}
              onPress={() => switchMethod('password')}
            />
            <Chip
              activeStyle="soft"
              symbol="envelope"
              label={t('account.auth.signIn.methodCode')}
              selected={method === 'otp'}
              onPress={() => switchMethod('otp')}
            />
          </View>

          <AuthField
            icon="envelope"
            label={t('account.auth.signIn.emailLabel')}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (errorField === 'email') clearError();
            }}
            invalid={errorField === 'email'}
            shakeKey={errorField === 'email' ? shakeTick : 0}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType={method === 'otp' && !otpSent ? 'send' : 'next'}
            submitBehavior="submit"
            onSubmitEditing={handleEmailSubmit}
          />

          {method === 'password' ? (
            <AuthField
              ref={passwordRef}
              icon="lock"
              label={t('account.auth.signIn.passwordLabel')}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (errorField === 'password') clearError();
              }}
              invalid={errorField === 'password'}
              shakeKey={errorField === 'password' ? shakeTick : 0}
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              textContentType={isSignUp ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={handlePasswordSubmit}
            />
          ) : otpSent ? (
            <View className="gap-3">
              <FormMessage
                tone="notice"
                symbol="envelope.badge"
                text={t('account.auth.signIn.otp.codeSentTo', { email })}
              />
              <OtpCodeField
                inputRef={codeRef}
                label={t('account.auth.signIn.otp.codeLabel')}
                value={otpCode}
                onChangeText={(v) => {
                  setOtpCode(v);
                  if (errorField === 'code') clearError();
                }}
                onSubmitEditing={handleVerifyOtp}
                invalid={errorField === 'code'}
                shakeKey={errorField === 'code' ? shakeTick : 0}
              />
            </View>
          ) : (
            <Text
              maxFontSizeMultiplier={maxFontSizeMultiplier.text}
              className="text-label-secondary px-1 text-[15px] leading-5"
            >
              {t('account.auth.signIn.otp.subtitle')}
            </Text>
          )}

          {error ? <FormMessage tone="error" text={error} /> : null}
        </Reveal>

        <Reveal index={3} style={{ gap: 4 }}>
          <GlassButton
            label={primary.label}
            onPress={primary.onPress}
            loading={loading}
          />
          {method === 'otp' && otpSent ? (
            <TextLink
              label={t('account.auth.signIn.otp.resendCta')}
              onPress={handleSendOtp}
              disabled={loading}
            />
          ) : null}
          {!isSignUp && !completed ? (
            <TextLink
              label={t('account.auth.signIn.newHere')}
              onPress={backToSetup}
            />
          ) : null}
        </Reveal>

        <Reveal index={4} style={{ gap: 10, marginTop: 4 }}>
          <View className="flex-row gap-3">
            <SocialPlaceholder
              symbol="apple.logo"
              label={t('account.auth.signIn.appleCta')}
            />
            <SocialPlaceholder
              symbol="globe"
              label={t('account.auth.signIn.googleCta')}
            />
          </View>
          <Text
            maxFontSizeMultiplier={maxFontSizeMultiplier.text}
            className="text-label-tertiary text-center text-xs leading-4"
          >
            {t('account.auth.signIn.socialComingSoon')}
          </Text>
          <Text
            maxFontSizeMultiplier={maxFontSizeMultiplier.text}
            className="text-label-tertiary px-4 pt-2 text-center text-xs leading-4"
          >
            {t('account.onboarding.disclaimer.point1')}
          </Text>
        </Reveal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Tertiary text button (Doc 02 §5.9): callout semibold accent, 44 pt tall. */
function TextLink({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      preset="subtle"
      hitSlop={12}
      onPress={onPress}
      style={{
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.text}
        className="text-tint text-[15px] font-semibold"
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/** Disabled social sign-in placeholder (needs a paid Apple Developer account). */
function SocialPlaceholder({
  symbol,
  label,
}: {
  symbol: 'apple.logo' | 'globe';
  label: string;
}) {
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: true }}
      className="border-line h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full border opacity-40"
    >
      <SymbolView
        name={symbol}
        size={16}
        weight="semibold"
        tintColor={themeColor('label')}
      />
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        className="text-label text-[14px] font-semibold"
      >
        {label}
      </Text>
    </View>
  );
}
