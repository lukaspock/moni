import {
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { REDUCE, duration, easing } from '@/theme/motion';

/** Kept outside hooks: shared values are mutated imperatively. */
export function fadeTo(sv: SharedValue<number>, to: number): void {
  sv.value = withTiming(to, {
    duration: duration.fast,
    easing: easing.settle,
    reduceMotion: REDUCE,
  });
}

/**
 * Field style hook for validation errors. Brand rule (01-brand-strategy):
 * no shake – the calm red border, message and haptic carry the error, so this
 * intentionally returns a static style. `shakeKey` stays in the API so callers
 * don't change if a motion is reintroduced later.
 */
export function useShake(_shakeKey: number | undefined) {
  return useAnimatedStyle(() => ({ transform: [{ translateX: 0 }] }));
}
