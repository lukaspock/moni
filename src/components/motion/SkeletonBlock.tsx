import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/motionPrefs';
import { useThemeHex } from '@/theme/colors';
import { REDUCE, duration } from '@/theme/motion';

import { withAlpha } from './colorAlpha';

const CYCLE_MS = 1800; // 1400 sweep + 400 pause
const SWEEP_SHARE = 1400 / CYCLE_MS;

/**
 * One shimmer phase (0..1 per cycle) to share between all skeletons of a
 * screen, so they sweep in sync with a single worklet driver.
 */
export function useSkeletonPhase(): SharedValue<number> {
  const reduce = useReduceMotion();
  const phase = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      cancelAnimation(phase);
      phase.value = 0;
      return;
    }
    phase.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(phase);
  }, [reduce, phase]);
  return phase;
}

export interface SkeletonBlockProps {
  width: DimensionValue;
  height: number;
  /** Default 12 */
  radius?: number;
  /** Appears only if loading lasts longer than this, default 150. */
  delayMs?: number;
  /** Shared phase from `useSkeletonPhase()`; default: own driver. */
  phase?: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
}

/**
 * Skeleton placeholder with a diagonal light sweep (40 % width, 1.4 s, pause
 * 0.4 s). Reduce Motion: static block at 60 % opacity. Hidden from
 * accessibility (the loading state belongs on the container).
 */
export function SkeletonBlock({
  width,
  height,
  radius = 12,
  delayMs = 150,
  phase: externalPhase,
  style,
}: SkeletonBlockProps) {
  const reduce = useReduceMotion();
  const fillHex = useThemeHex('surfaceHigh');
  const accent = useThemeHex('accent');
  const ownPhase = useSkeletonPhase();
  const phase = externalPhase ?? ownPhase;
  const [w, setW] = useState(0);

  const visible = useSharedValue(0);
  useEffect(() => {
    visible.value = withDelay(
      delayMs,
      withTiming(1, { duration: duration.fast, reduceMotion: REDUCE }),
      REDUCE,
    );
  }, [delayMs, visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: visible.value * (reduce ? 0.6 : 1),
  }));
  const sweepStyle = useAnimatedStyle(() => {
    const p = Math.min(phase.value / SWEEP_SHARE, 1);
    // smooth ease in/out
    const e = p * p * (3 - 2 * p);
    return { transform: [{ translateX: -0.4 * w + e * 1.4 * w }] };
  });

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius: radius,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: fillHex,
        },
        style,
        containerStyle,
      ]}
    >
      {reduce ? null : (
        <Animated.View style={[{ width: '40%', height: '100%' }, sweepStyle]}>
          <LinearGradient
            colors={[
              withAlpha(accent, 0),
              withAlpha(accent, 0.1),
              withAlpha(accent, 0),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.35 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}
