import * as Haptics from 'expo-haptics';
import { GlassView } from 'expo-glass-effect';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, Text } from 'react-native';

import { useThemeHex } from '@/theme/colors';

export interface GlassActionButtonProps {
  label: string;
  onPress: () => void;
  symbol?: SymbolViewProps['name'];
}

/**
 * Full-width, tinted native Liquid Glass call-to-action (`GlassView` from
 * `expo-glass-effect`, iOS 26+). The tap is handled by a plain RN `Pressable`
 * (the `@expo/ui` glass Button swallowed taps on-device, see GlassButton.tsx).
 */
export function GlassActionButton({
  label,
  onPress,
  symbol = 'plus',
}: GlassActionButtonProps) {
  const tint = useThemeHex('accent');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
    >
      <GlassView
        glassEffectStyle="regular"
        tintColor={tint}
        isInteractive
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
          size={20}
          weight="semibold"
          tintColor="white"
        />
        <Text className="text-lg font-semibold text-white">{label}</Text>
      </GlassView>
    </Pressable>
  );
}
