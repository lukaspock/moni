import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

import { fixedColors, themeColor } from '@/theme/colors';
import { press } from '@/theme/motion';

import { elevationStyle } from './elevation';
import { usePressScale } from './PressableScale';

export type CardVariant = 'flat' | 'raised' | 'hero' | 'tinted' | 'inset';
/** Which `*Soft` surface a `tinted` card uses. */
export type CardTone =
  'accent' | 'bonus' | 'danger' | 'protein' | 'carbs' | 'fat';

export interface CardProps {
  children: ReactNode;
  /** Default `flat`. `hero` = always-dark forest gradient (one per screen). */
  variant?: CardVariant;
  /** Only for `variant="tinted"`. Default `accent`. */
  tone?: CardTone;
  /** Makes the card tappable (scale 0.98 + surface/highlight change). */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Extra layout classes (gap, flex-row, overflow-hidden …). A shorthand `p-*` class replaces the default padding; side classes (`pt-*`, `px-*`) only override their side. */
  className?: string;
  style?: StyleProp<ViewStyle>;
}

const RADIUS = {
  flat: 24,
  raised: 24,
  tinted: 24,
  hero: 32,
  inset: 16,
} as const;
const PADDING_CLASS = {
  flat: 'p-5',
  raised: 'p-5',
  tinted: 'p-5',
  hero: 'p-6',
  inset: 'p-3',
} as const;
const TONE_BG: Record<CardTone, string> = {
  accent: 'bg-tint-soft',
  bonus: 'bg-bonus-soft',
  danger: 'bg-destructive-soft',
  protein: 'bg-protein-soft',
  carbs: 'bg-carbs-soft',
  fat: 'bg-fat-soft',
};
const HAIRLINE_ON_HERO = 'rgba(245,242,234,0.10)';
const PRESS_HIGHLIGHT = 'rgba(255,255,255,0.06)';
// Only a shorthand `p-*` replaces the default padding. Side classes (`pt-4`,
// `px-5` …) keep it and override just their side (RN: paddingTop beats padding).
const HAS_PADDING = /(^|\s)p-/;
const HAS_GAP = /(^|\s)gap-/;

/**
 * The one surface for every grouped block (Doc 02 §5.1). Padding 20 (hero 24,
 * inset 12), gap 12 between children. Pass `onPress` for a tappable card.
 */
export function Card({
  children,
  variant = 'flat',
  tone = 'accent',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  className = '',
  style,
}: CardProps) {
  const scheme = useColorScheme();
  const [pressed, setPressed] = useState(false);
  const scale = usePressScale(variant === 'hero' ? press.subtle.scale : 0.98);
  const radius = RADIUS[variant];
  const padding = HAS_PADDING.test(className) ? '' : PADDING_CLASS[variant];
  const gap = HAS_GAP.test(className) ? '' : 'gap-3';
  const interactive = onPress != null;

  let surface: string;
  switch (variant) {
    case 'hero':
      surface = '';
      break;
    case 'tinted':
      surface = TONE_BG[tone];
      break;
    case 'inset':
      surface = 'bg-surface-high';
      break;
    default:
      surface = pressed && interactive ? 'bg-surface-raised' : 'bg-surface';
  }

  const elevation = elevationStyle(
    variant === 'hero' ? 'hero' : variant === 'raised' ? 'raised' : 'flat',
    scheme,
  );
  const dark = scheme === 'dark';
  const base: ViewStyle = {
    borderRadius: radius,
    borderCurve: 'continuous',
    ...elevation,
    ...(variant === 'hero' ? { backgroundColor: fixedColors.forestBot } : null),
    ...((variant === 'flat' || variant === 'raised') && dark
      ? {
          borderWidth: 1,
          borderColor: themeColor('border'),
        }
      : null),
    ...(variant === 'raised' && dark
      ? { borderTopColor: 'rgba(255,255,255,0.05)' }
      : null),
  };

  const body = (
    <Animated.View
      className={`${gap} ${surface} ${padding} ${className}`}
      style={[base, interactive ? scale.style : null, style]}
    >
      {variant === 'hero' ? (
        <>
          <LinearGradient
            colors={[fixedColors.forestTop, fixedColors.forestBot]}
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: radius, borderCurve: 'continuous' },
            ]}
            pointerEvents="none"
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: radius,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: HAIRLINE_ON_HERO,
                backgroundColor: pressed ? PRESS_HIGHLIGHT : 'transparent',
              },
            ]}
          />
        </>
      ) : null}
      {children}
    </Animated.View>
  );

  if (!interactive) return body;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        setPressed(true);
        scale.onPressIn();
      }}
      onPressOut={() => {
        setPressed(false);
        scale.onPressOut();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {body}
    </Pressable>
  );
}
