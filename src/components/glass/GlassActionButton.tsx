import { GlassView } from 'expo-glass-effect';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, Text } from 'react-native';

import { useThemeHex } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { haptic } from '@/lib/haptics';

export interface GlassActionButtonProps {
  label: string;
  onPress: () => void;
  symbol?: SymbolViewProps['name'];
  /** 40 % alpha, no color change (Doc 02 §5.9). */
  disabled?: boolean;
}

/**
 * Full-width, accent-tinted native Liquid Glass call-to-action (`GlassView` from
 * `expo-glass-effect`, iOS 26+), 56 pt high, label/icon in `on-tint`. The tap is
 * handled by a plain RN `Pressable` (the `@expo/ui` glass Button swallowed taps
 * on-device, see GlassButton.tsx).
 */
export function GlassActionButton({
  label,
  onPress,
  symbol = 'plus',
  disabled = false,
}: GlassActionButtonProps) {
  const tint = useThemeHex('accent');
  const onTint = useThemeHex('onAccent');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={{ opacity: disabled ? 0.4 : 1 }}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
    >
      <GlassView
        glassEffectStyle="regular"
        tintColor={tint}
        isInteractive={!disabled}
        style={{
          height: 56,
          borderRadius: 28,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <SymbolView
          name={symbol}
          size={18}
          weight="semibold"
          tintColor={onTint}
        />
        <Text
          maxFontSizeMultiplier={1.3}
          style={[textStyles.button, { color: onTint }]}
        >
          {label}
        </Text>
      </GlassView>
    </Pressable>
  );
}
