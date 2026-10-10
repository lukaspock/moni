import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { themeColor } from '@/theme/colors';
import { REDUCE, duration, exit } from '@/theme/motion';
import { maxFontSizeMultiplier } from '@/theme/typography';

/**
 * Calm inline message for auth forms. `error`: one caption line in danger
 * with `exclamationmark.circle.fill` (Doc 02 §5.10). `notice`: soft tint
 * row (e.g. "code sent"). Announced by VoiceOver by the caller.
 */
export function FormMessage({
  tone,
  text,
  symbol,
}: {
  tone: 'error' | 'notice';
  text: string;
  symbol?: SymbolViewProps['name'];
}) {
  const entering = FadeIn.duration(duration.fast).reduceMotion(REDUCE);
  const exiting = FadeOut.duration(exit(duration.fast)).reduceMotion(REDUCE);

  if (tone === 'error') {
    return (
      <Animated.View
        entering={entering}
        exiting={exiting}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        className="flex-row items-start gap-1.5 px-1"
      >
        <View className="pt-0.5">
          <SymbolView
            name={symbol ?? 'exclamationmark.circle.fill'}
            size={14}
            weight="semibold"
            tintColor={themeColor('danger')}
          />
        </View>
        <Text
          maxFontSizeMultiplier={maxFontSizeMultiplier.text}
          className="text-destructive flex-1 text-[13px] font-medium leading-[17px]"
        >
          {text}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      accessibilityLiveRegion="polite"
      className="bg-tint-soft flex-row items-center gap-3 rounded-inner px-4 py-3"
      style={{ borderCurve: 'continuous' }}
    >
      <SymbolView
        name={symbol ?? 'checkmark.circle.fill'}
        size={18}
        weight="semibold"
        tintColor={themeColor('accent')}
      />
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.text}
        className="text-label flex-1 text-[15px] leading-5"
      >
        {text}
      </Text>
    </Animated.View>
  );
}
