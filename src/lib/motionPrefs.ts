import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Reduce Motion preference (iOS Settings > Accessibility > Motion).
 * Use where whole sequences should be replaced by static states; Reanimated
 * timings/springs additionally pass `reduceMotion: REDUCE` (src/theme/motion).
 */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (active) setReduced(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

/** Returns `reducedValue` when Reduce Motion is on, else `value`. */
export function useMotionValue<T>(value: T, reducedValue: T): T {
  return useReduceMotion() ? reducedValue : value;
}
