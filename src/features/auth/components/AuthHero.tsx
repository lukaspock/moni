import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { Keyboard, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { RingPattern, Wordmark } from '@/components/brand';
import { useReduceMotion } from '@/lib/motionPrefs';
import { fixedColors, useThemeHex } from '@/theme/colors';
import { REDUCE, duration, easing } from '@/theme/motion';

const WORDMARK_W = 200;
/** Logo centre sits this far above the column centre (wordmark below it). */
const COMPACT_SCALE = 0.5;
const CONTENT_H = 196;
const COMPACT_CONTENT_H = 44;
export const WAVE_H = 30;
const WAVE_AMP = 6;
const WAVE_POINTS = 48;

/** Kept outside the component: shared values are mutated imperatively. */
function animateTo(sv: SharedValue<number>, to: number, ms: number): void {
  sv.value = withTiming(to, {
    duration: ms,
    easing: easing.settle,
    reduceMotion: REDUCE,
  });
}

/** 0 = keyboard hidden, 1 = shown; follows the keyboard's own timing. */
export function useKeyboardProgress(): SharedValue<number> {
  const progress = useSharedValue(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) =>
      animateTo(progress, 1, e.duration || duration.base),
    );
    const hide = Keyboard.addListener('keyboardWillHide', (e) =>
      animateTo(progress, 0, e.duration || duration.base),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [progress]);
  return progress;
}

/** Gentle sine edge (one and a quarter periods), filled below the line. */
function wavePaths(width: number): { fill: string; line: string } {
  const mid = WAVE_H * 0.5;
  let line = '';
  for (let i = 0; i <= WAVE_POINTS; i++) {
    const x = (width * i) / WAVE_POINTS;
    const y =
      mid + WAVE_AMP * Math.sin((x / width) * Math.PI * 2.5 + Math.PI * 0.15);
    line += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(2)}`;
  }
  return { line, fill: `${line}L${width} ${WAVE_H + 1}L0 ${WAVE_H + 1}Z` };
}

/**
 * Always-dark forest hero for the auth screens: faint ring pattern, the
 * breathing logo + wordmark, and a soft sine "waterline" that melts into the
 * screen background. Shrinks to a compact logo strip while the keyboard is
 * open (`keyboard` = progress 0..1).
 */
export function AuthHero({ keyboard }: { keyboard: SharedValue<number> }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduce = useReduceMotion();
  const bg = useThemeHex('bg');
  const waves = useMemo(() => wavePaths(width), [width]);

  const full = insets.top + CONTENT_H + WAVE_H;
  const compact = insets.top + COMPACT_CONTENT_H + WAVE_H;

  const breath = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      cancelAnimation(breath);
      animateTo(breath, 0, 0);
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: duration.ambient, easing: easing.smooth }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [reduce, breath]);

  const heroStyle = useAnimatedStyle(() => ({
    height: interpolate(keyboard.value, [0, 1], [full, compact]),
  }));
  const columnStyle = useAnimatedStyle(() => {
    const k = keyboard.value;
    const s = 1 - (1 - COMPACT_SCALE) * k;
    return {
      transform: [{ scale: s * (1 + 0.025 * breath.value) }],
    };
  });

  return (
    <Animated.View
      style={[{ overflow: 'hidden' }, heroStyle]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        colors={[fixedColors.forestTop, fixedColors.forestBot]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <RingPattern
        width={width}
        height={full}
        opacity={0.07}
        scale={0.7}
        color={fixedColors.lime}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          bottom: WAVE_H,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View style={[{ alignItems: 'center' }, columnStyle]}>
          <Wordmark
            width={WORDMARK_W}
            color={fixedColors.paper}
            colorMark
            decorative
          />
        </Animated.View>
      </View>
      <Svg
        width={width}
        height={WAVE_H}
        style={{ position: 'absolute', left: 0, bottom: 0 }}
        pointerEvents="none"
      >
        <Path d={waves.fill} fill={bg} />
        <Path
          d={waves.line}
          stroke={fixedColors.lime}
          strokeOpacity={0.35}
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}
