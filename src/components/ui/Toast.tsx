import { Pressable, Text, View, useColorScheme } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { fixedColors, themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

import { elevationStyle } from './elevation';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastProps {
  message: string;
  kind?: ToastKind;
  actionLabel?: string;
  onAction?: () => void;
}

const ICON = {
  success: 'checkmark.circle.fill',
  error: 'exclamationmark.circle.fill',
  info: 'info.circle.fill',
} as const;
const ICON_COLOR = {
  success: 'success',
  error: 'danger',
  info: 'accent',
} as const;

/**
 * Toast visual only (Doc 02 §5.12): capsule, S3 in dark, inverted ink in light.
 * Positioning (safe-area top + 8, width screen - 40, max 420), timing (3 s) and
 * animation belong to whoever hosts it.
 */
export function ToastView({
  message,
  kind = 'info',
  actionLabel,
  onAction,
}: ToastProps) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={`min-h-[52px] flex-row items-center gap-3 rounded-full px-4 py-3 ${
        dark ? 'bg-surface-high' : ''
      }`}
      style={[
        { borderCurve: 'continuous', maxWidth: 420 },
        dark ? null : { backgroundColor: fixedColors.ink },
        elevationStyle('overlay', scheme),
      ]}
    >
      <SymbolView
        name={ICON[kind]}
        size={20}
        weight="semibold"
        tintColor={dark ? themeColor(ICON_COLOR[kind]) : toastIconFixed(kind)}
      />
      <Text
        className={dark ? 'text-label flex-1' : 'flex-1'}
        maxFontSizeMultiplier={1.3}
        style={[
          textStyles.callout,
          { fontWeight: '500' },
          dark ? null : { color: fixedColors.paper },
        ]}
      >
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text
            style={[
              textStyles.callout,
              { fontWeight: '600', color: fixedColors.lime },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function toastIconFixed(kind: ToastKind): string {
  return kind === 'error' ? fixedColors.danger : fixedColors.lime;
}
