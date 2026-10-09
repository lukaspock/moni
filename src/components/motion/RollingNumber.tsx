import { useEffect, useRef, useState } from 'react';
import {
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/motionPrefs';
import { useThemeHex } from '@/theme/colors';
import {
  REDUCE,
  duration,
  easing,
  glow,
  spring,
  stagger,
} from '@/theme/motion';
import { fontFamily } from '@/theme/typography';

import { CountText } from './CountText';
import {
  columnDelayMs,
  isBigDigitJump,
  rollingCells,
  type RollingOptions,
} from './rolling';

export interface RollingNumberProps extends RollingOptions {
  value: number;
  /** 'roll' = odometer digits (default), 'count' = eased count on the UI thread */
  mode?: 'roll' | 'count';
  /** Only for mode='count' (plain JS function is fine). */
  format?: (v: number) => string;
  fontSize: number;
  fontFamily?: string;
  /** Text color as hex; default theme `label`. */
  color?: string;
  /** Afterglow color on change; default theme `accent`. */
  glowColor?: string;
  /** ms, default `duration.slow` (count mode). */
  duration?: number;
  /** First render animates from here. */
  startFrom?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Number with brand display font and tabular digits. Roll mode: every digit
 * is a vertical 0-9 strip on the UI thread, the ones digit moves first,
 * changed digits briefly glow. Count mode counts up/down. Reduce Motion:
 * value jumps, only a 300 ms color afterglow remains.
 */
export function RollingNumber({
  value,
  mode = 'roll',
  format,
  fontSize,
  fontFamily: family = fontFamily.displayBold,
  color,
  glowColor,
  duration: countDuration = duration.slow,
  startFrom,
  accessibilityLabel,
  style,
  fractionDigits,
  groupSeparator,
  decimalSeparator,
}: RollingNumberProps) {
  const labelHex = useThemeHex('label');
  const accentHex = useThemeHex('accent');
  const textColor = color ?? labelHex;
  const afterglow = glowColor ?? accentHex;
  const lineHeight = Math.ceil(fontSize * 1.15);
  const textStyle: TextStyle = {
    fontFamily: family,
    fontSize,
    lineHeight,
    fontVariant: ['tabular-nums'],
    color: textColor,
  };

  const opts: RollingOptions = {
    fractionDigits,
    groupSeparator,
    decimalSeparator,
  };
  const [mounted, setMounted] = useState(startFrom == null);
  useEffect(() => {
    if (mounted) return;
    const id = setTimeout(() => setMounted(true), 16);
    return () => clearTimeout(id);
  }, [mounted]);

  if (mode === 'count') {
    return (
      <View style={style}>
        <CountText
          value={value}
          startFrom={startFrom}
          duration={countDuration}
          format={
            format ??
            ((v) =>
              rollingCells(v, opts)
                .map((c) => (c.kind === 'digit' ? c.digit : c.char))
                .join(''))
          }
          style={textStyle}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  }

  const shown = mounted ? value : (startFrom ?? value);
  const cells = rollingCells(shown, opts);
  const label =
    accessibilityLabel ??
    rollingCells(value, opts)
      .map((c) => (c.kind === 'digit' ? c.digit : c.char))
      .join('');

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[{ flexDirection: 'row', height: lineHeight }, style]}
    >
      {cells.map((cell, i) => {
        const fromRight = cells.length - 1 - i;
        return cell.kind === 'digit' ? (
          <DigitColumn
            key={cell.key}
            digit={cell.digit}
            indexFromRight={fromRight}
            lineHeight={lineHeight}
            textStyle={textStyle}
            baseColor={textColor}
            glowColor={afterglow}
            animateIn={mounted}
          />
        ) : (
          <Text
            key={cell.key}
            style={[textStyle, { height: lineHeight }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {cell.char}
          </Text>
        );
      })}
    </View>
  );
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function DigitColumn({
  digit,
  indexFromRight,
  lineHeight,
  textStyle,
  baseColor,
  glowColor,
  animateIn,
}: {
  digit: number;
  indexFromRight: number;
  lineHeight: number;
  textStyle: TextStyle;
  baseColor: string;
  glowColor: string;
  animateIn: boolean;
}) {
  const reduce = useReduceMotion();
  const offset = useSharedValue(-digit * lineHeight);
  const glowing = useSharedValue(0);
  const previous = useRef(digit);

  useEffect(() => {
    const prev = previous.current;
    if (prev === digit) return;
    previous.current = digit;
    const target = -digit * lineHeight;
    glowing.value = reduce
      ? withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(0, { duration: 300 }),
        )
      : withSequence(
          withTiming(1, { duration: glow.attack }),
          withTiming(0, { duration: glow.decay, easing: easing.settle }),
        );
    if (reduce) {
      offset.value = target;
      return;
    }
    const delay = columnDelayMs(indexFromRight, stagger.tight);
    offset.value = withDelay(
      delay,
      isBigDigitJump(prev, digit)
        ? withTiming(target, {
            duration: duration.slow,
            easing: easing.rise,
            reduceMotion: REDUCE,
          })
        : withSpring(target, {
            ...spring.settle,
            overshootClamping: true,
            reduceMotion: REDUCE,
          }),
      REDUCE,
    );
  }, [digit, indexFromRight, lineHeight, reduce, offset, glowing]);

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));
  const colorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(glowing.value, [0, 1], [baseColor, glowColor]),
  }));

  return (
    <Animated.View
      entering={
        animateIn
          ? FadeIn.duration(duration.fast).reduceMotion(REDUCE)
          : undefined
      }
      style={{ height: lineHeight, overflow: 'hidden' }}
    >
      {/* invisible "0" gives the column its width */}
      <Text
        style={[textStyle, { opacity: 0, height: lineHeight }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        0
      </Text>
      <Animated.View
        style={[{ position: 'absolute', left: 0, top: 0 }, stripStyle]}
      >
        {DIGITS.map((d) => (
          <Animated.Text
            key={d}
            style={[textStyle, { height: lineHeight }, colorStyle]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {d}
          </Animated.Text>
        ))}
      </Animated.View>
    </Animated.View>
  );
}
