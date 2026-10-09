import { useEffect, useState, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import {
  REDUCE,
  duration as durationTokens,
  easing,
  reveal,
  stagger,
  staggerDelay,
} from '@/theme/motion';

/** Keys that already played in this app run (see `once`). */
const played = new Set<string>();

export interface RevealProps {
  /** Stagger position. */
  index?: number;
  /** Stagger step, default `stagger.base`. */
  step?: number;
  /** Extra delay in ms. */
  delay?: number;
  /** Rise in points, default `reveal.rise` (8). */
  rise?: number;
  /** Default `duration.base`. */
  duration?: number;
  /** Plays only once per app start for this key. */
  once?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Entrance: fade + small rise + 0.98 -> 1 (UI thread, `rise` curve, total
 * stagger capped at 400 ms). Reduce Motion: appears immediately.
 */
export function Reveal({
  index = 0,
  step = stagger.base,
  delay = 0,
  rise = reveal.rise,
  duration = durationTokens.base,
  once,
  children,
  style,
}: RevealProps) {
  const [skip] = useState(() => once != null && played.has(once));
  const progress = useSharedValue(skip ? 1 : 0);

  useEffect(() => {
    if (skip) return;
    if (once != null) played.add(once);
    progress.value = withDelay(
      staggerDelay(index, step) + delay,
      withTiming(1, { duration, easing: easing.rise, reduceMotion: REDUCE }),
      REDUCE,
    );
  }, [skip, once, index, step, delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * rise },
      { scale: reveal.scaleFrom + (1 - reveal.scaleFrom) * progress.value },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}
