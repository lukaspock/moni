import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/motion';
import { themeColor, useThemeHex } from '@/theme/colors';
import { maxFontSizeMultiplier } from '@/theme/typography';

import { fadeTo, useShake } from './authFieldMotion';

export type AuthFieldProps = Omit<TextInputProps, 'style' | 'className'> & {
  ref?: Ref<TextInput>;
  /** SF Symbol on the left (envelope, lock, ...). */
  icon: SymbolViewProps['name'];
  /** Accessible name; also the placeholder. */
  label: string;
  /** Red 2 pt border while true. */
  invalid?: boolean;
  /** Increment to shake the field (validation error). */
  shakeKey?: number;
  /** Password field: adds a show/hide toggle and masks the text. */
  secureToggle?: boolean;
};

/**
 * Auth input (Doc 02 §5.10): 56 pt, radius 16, surface + 1 pt hairline; on
 * focus a 2 pt accent ring fades in, on error a 2 pt danger ring. Rings are
 * overlays so the text never shifts.
 */
export function AuthField({
  ref,
  icon,
  label,
  invalid = false,
  shakeKey,
  secureToggle = false,
  onFocus,
  onBlur,
  ...inputProps
}: AuthFieldProps) {
  const { t } = useTranslation();
  const accent = useThemeHex('accent');
  const danger = useThemeHex('danger');
  const [hidden, setHidden] = useState(true);

  const focus = useSharedValue(0);
  const error = useSharedValue(invalid ? 1 : 0);
  useEffect(() => fadeTo(error, invalid ? 1 : 0), [invalid, error]);

  const shakeStyle = useShake(shakeKey);
  const focusRing = useAnimatedStyle(() => ({
    opacity: focus.value * (1 - error.value),
  }));
  const errorRing = useAnimatedStyle(() => ({ opacity: error.value }));

  const ring = {
    position: 'absolute' as const,
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 16,
    borderCurve: 'continuous' as const,
    borderWidth: 2,
  };

  return (
    <Animated.View style={shakeStyle}>
      <View
        className="border-line bg-surface min-h-14 flex-row items-center gap-3 rounded-inner border pl-4"
        style={{
          borderCurve: 'continuous',
          paddingRight: secureToggle ? 4 : 16,
        }}
      >
        <SymbolView
          name={icon}
          size={18}
          weight="medium"
          tintColor={themeColor(invalid ? 'danger' : 'labelSecondary')}
        />
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={label}
          placeholder={label}
          placeholderTextColor={themeColor('labelTertiary')}
          selectionColor={themeColor('accent')}
          secureTextEntry={secureToggle ? hidden : inputProps.secureTextEntry}
          maxFontSizeMultiplier={maxFontSizeMultiplier.text}
          onFocus={(e) => {
            fadeTo(focus, 1);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            fadeTo(focus, 0);
            onBlur?.(e);
          }}
          className="text-label min-h-14 flex-1 py-3 text-[17px]"
        />
        {secureToggle ? (
          <PressableScale
            haptic="select"
            preset="strong"
            accessibilityRole="button"
            accessibilityLabel={t(
              hidden
                ? 'account.auth.signIn.showPassword'
                : 'account.auth.signIn.hidePassword',
            )}
            onPress={() => setHidden((h) => !h)}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SymbolView
              name={hidden ? 'eye' : 'eye.slash'}
              size={18}
              weight="medium"
              tintColor={themeColor('labelSecondary')}
            />
          </PressableScale>
        ) : null}
        <Animated.View
          pointerEvents="none"
          style={[ring, { borderColor: accent }, focusRing]}
        />
        <Animated.View
          pointerEvents="none"
          style={[ring, { borderColor: danger }, errorRing]}
        />
      </View>
    </Animated.View>
  );
}
