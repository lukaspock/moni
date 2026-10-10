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

const SETTLED: ViewStyle = { opacity: 1, transform: [] };

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
  // Fail-safe: once the entrance is over, render a plain (fully visible) View.
  // A screen frozen while the animation ran (inactive tab) could otherwise keep
  // the stale opacity 0 and leave whole sections invisible.
  const [done, setDone] = useState(skip);
  const progress = useSharedValue(skip ? 1 : 0);

  useEffect(() => {
    if (skip) return;
    if (once != null) played.add(once);
    const total = staggerDelay(index, step) + delay;
    progress.value = withDelay(
      total,
      withTiming(1, { duration, easing: easing.rise, reduceMotion: REDUCE }),
      REDUCE,
    );
    const timer = setTimeout(() => setDone(true), total + duration + 120);
    return () => clearTimeout(timer);
  }, [skip, once, index, step, delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * rise },
      { scale: reveal.scaleFrom + (1 - reveal.scaleFrom) * progress.value },
    ],
  }));

  // Same element either way (no remount of children); after the entrance the
  // explicit final style wins over any stale animated value.
  return (
    <Animated.View style={[style, done ? SETTLED : animatedStyle]}>
      {children}
    </Animated.View>
  );
}
