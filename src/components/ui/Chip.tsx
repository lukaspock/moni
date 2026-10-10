import { Text } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { themeColor } from '@/theme/colors';

import { PressableScale } from './PressableScale';

export interface ChipProps {
  label: string;
  /** Selected/active state. */
  selected?: boolean;
  /** `solid` (default): active = accent fill + on-tint text (filters). `soft`: active = accentSoft + accent text (tags). */
  activeStyle?: 'solid' | 'soft';
  symbol?: SymbolViewProps['name'];
  onPress?: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
}

/** Filter/choice chip: 36 pt high capsule (visual), 44 pt tap area (Doc 02 §5.3). Use `flex-row flex-wrap gap-2` for groups. */
export function Chip({
  label,
  selected = false,
  activeStyle = 'solid',
  symbol,
  onPress,
  disabled,
  accessibilityHint,
}: ChipProps) {
  const solid = activeStyle === 'solid';
  const bg = selected
    ? solid
      ? 'bg-tint'
      : 'bg-tint-soft'
    : 'bg-surface-raised';
  const text = selected
    ? solid
      ? 'text-on-tint'
      : 'text-tint'
    : 'text-label-secondary';
  const iconColor = selected
    ? solid
      ? themeColor('onAccent')
      : themeColor('accent')
    : themeColor('labelSecondary');
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      className={`h-9 flex-row items-center justify-center gap-1.5 rounded-full px-3.5 ${bg} ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      {symbol ? (
        <SymbolView
          name={symbol}
          size={14}
          weight="semibold"
          tintColor={iconColor}
        />
      ) : null}
      <Text
        maxFontSizeMultiplier={1.3}
        className={`text-sm font-semibold ${text}`}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
