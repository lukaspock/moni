import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { themeColor } from '@/theme/colors';

export type SFSymbol = Extract<SymbolViewProps['name'], string>;

/**
 * Large-tap-target selectable card for onboarding's single/multi-choice
 * questions. Plain RN Pressable + NativeWind/PlatformColor tokens per PLAN §2's
 * fallback rule — no `@expo/ui` control fits a chunky icon+label choice list.
 * Staggered entrance (`index`), a quick "pop" when it becomes selected, and a
 * selection haptic. All Reanimated animations follow the system Reduce Motion
 * setting (default `ReduceMotion.System`).
 */
export function OptionCard({
  label,
  description,
  selected,
  onPress,
  symbol,
  emoji,
  index = 0,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  symbol?: SFSymbol;
  emoji?: string;
  index?: number;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (selected) {
      scale.value = withSequence(withTiming(0.97, { duration: 70 }), withSpring(1, { damping: 12, stiffness: 260 }));
    }
  }, [selected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInDown.duration(260).delay(60 + index * 45)} style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={description ? `${label}, ${description}` : label}
        onPress={() => {
          void Haptics.selectionAsync();
          onPress();
        }}
        className={`min-h-16 flex-row items-center gap-4 rounded-2xl border-2 px-4 py-4 ${
          selected ? 'border-tint bg-secondary-system-background' : 'border-separator bg-system-background'
        }`}
      >
        {symbol || emoji ? (
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-secondary-system-background">
            {symbol ? (
              <SymbolView
                name={symbol}
                size={24}
                type="hierarchical"
                tintColor={selected ? themeColor('accent') : undefined}
              />
            ) : (
              <Text className="text-2xl">{emoji}</Text>
            )}
          </View>
        ) : null}
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-semibold text-label">{label}</Text>
          {description ? <Text className="text-sm text-secondary-label">{description}</Text> : null}
        </View>
        <View
          className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
            selected ? 'border-tint bg-tint' : 'border-separator'
          }`}
        >
          {selected ? <SymbolView name="checkmark" size={12} weight="bold" tintColor="white" /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}
