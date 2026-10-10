import { cssInterop } from 'nativewind';
import { useEffect, useRef, useState } from 'react';
import {
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/motionPrefs';

import { countFrames, countTable, tableIndex } from './rolling';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
cssInterop(AnimatedTextInput, { className: 'style' });

export interface CountTextProps extends Omit<TextProps, 'children'> {
  value: number;
  /** ms, default 700 */
  duration?: number;
  /** first render animates from here; default = no mount animation */
  startFrom?: number;
  format?: (v: number) => string;
}

const defaultFormat = (v: number) => String(Math.round(v));

/**
 * Count-up/down on the UI thread, without a setState per frame. The JS
 * `format` runs only once per animation: it pre-renders an eased label table
 * and the UI thread merely picks the label for the current progress (animated
 * `text` prop of a read-only TextInput). An invisible `Text` with the final
 * label gives the layout its size and the accessibility value. Reduce Motion:
 * jumps straight to the value.
 *
 * Layout classes (margin, flex) belong on a parent View, not here.
 */
export function CountText({
  value,
  duration = 700,
  startFrom,
  format = defaultFormat,
  className,
  style,
  allowFontScaling,
  maxFontSizeMultiplier,
  ...textProps
}: CountTextProps) {
  const reduce = useReduceMotion();
  const finalLabel = format(value);
  const [initialLabel] = useState(() => format(startFrom ?? value));
  const progress = useSharedValue(1);
  const labels = useSharedValue<string[]>([initialLabel]);
  const table = useRef<number[]>([startFrom ?? value]);

  useEffect(() => {
    const values = table.current;
    const current = values[tableIndex(progress.value, values.length)] ?? value;
    if (reduce || duration <= 0 || current === value) {
      table.current = [value];
      labels.value = [finalLabel];
      progress.value = 1;
      return;
    }
    const next = countTable(current, value, countFrames(duration));
    const nextLabels = next.map((v) => format(v));
    nextLabels[nextLabels.length - 1] = finalLabel;
    table.current = next;
    labels.value = nextLabels;
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: Easing.linear });
    // `format` is intentionally not a dependency (inline closures); a changed
    // result for the same value is covered by `finalLabel`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, finalLabel, duration, reduce]);

  const animatedProps = useAnimatedProps(() => {
    const list = labels.value;
    const text = list[tableIndex(progress.value, list.length)] ?? '';
    return { text, defaultValue: text } as Partial<TextInputProps>;
  });

  const interop = { className } as Record<string, unknown>;
  const fontScaling = { allowFontScaling, maxFontSizeMultiplier };

  return (
    <View>
      <Text
        {...textProps}
        {...fontScaling}
        {...interop}
        style={[style, { opacity: 0 }]}
        accessibilityLabel={finalLabel}
      >
        {finalLabel}
      </Text>
      <AnimatedTextInput
        {...interop}
        {...fontScaling}
        editable={false}
        pointerEvents="none"
        scrollEnabled={false}
        defaultValue={initialLabel}
        animatedProps={animatedProps}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          style,
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
          },
        ]}
      />
    </View>
  );
}
