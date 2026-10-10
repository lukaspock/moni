import { GlassView } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeHex } from '@/theme/colors';

export interface FloatingActionButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Large floating accent-tinted "+" button using native Liquid Glass (`GlassView` from
 * `expo-glass-effect`, PLAN §2 / §7.2) — never `expo-blur` or opacity fakes.
 */
export function FloatingActionButton({
  onPress,
  accessibilityLabel,
  size = 60,
  style,
}: FloatingActionButtonProps) {
  const tint = useThemeHex('accent');
  const onTint = useThemeHex('onAccent');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      <GlassView
        glassEffectStyle="regular"
        tintColor={tint}
        isInteractive
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SymbolView
          name="plus"
          size={size * 0.42}
          weight="semibold"
          tintColor={onTint}
        />
      </GlassView>
    </Pressable>
  );
}
