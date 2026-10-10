import { useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { themeColor } from '@/theme/colors';
import { maxFontSizeMultiplier, textStyles } from '@/theme/typography';

import { useShake } from './authFieldMotion';

export const OTP_LENGTH = 6;
const SLOTS = Array.from({ length: OTP_LENGTH }, (_, i) => i);

/**
 * 6-digit code entry: one hidden TextInput (keeps iOS one-time-code autofill
 * and paste working) under six display boxes in tabular Bricolage digits.
 */
export function OtpCodeField({
  inputRef,
  value,
  onChangeText,
  onSubmitEditing,
  invalid = false,
  shakeKey,
  label,
}: {
  inputRef: RefObject<TextInput | null>;
  value: string;
  onChangeText: (code: string) => void;
  onSubmitEditing?: () => void;
  invalid?: boolean;
  shakeKey?: number;
  label: string;
}) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const shakeStyle = useShake(shakeKey);
  const active = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <Animated.View style={shakeStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{
          text: t('account.auth.signIn.otp.codeProgress', {
            filled: value.length,
          }),
        }}
        onPress={() => inputRef.current?.focus()}
        className="flex-row gap-2"
      >
        {SLOTS.map((i) => {
          const digit = value[i];
          const isActive = focused && i === active;
          const border = invalid
            ? themeColor('danger')
            : isActive
              ? themeColor('accent')
              : themeColor('separator');
          return (
            <View
              key={i}
              className="bg-surface h-16 flex-1 items-center justify-center rounded-inner"
              style={{
                borderCurve: 'continuous',
                borderWidth: isActive || invalid ? 2 : 1,
                borderColor: border,
              }}
            >
              <Text
                maxFontSizeMultiplier={maxFontSizeMultiplier.numeric}
                style={[textStyles.numericM, { color: themeColor('label') }]}
              >
                {digit ?? ''}
              </Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) =>
          onChangeText(v.replace(/\D/g, '').slice(0, OTP_LENGTH))
        }
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        caretHidden
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />
    </Animated.View>
  );
}
