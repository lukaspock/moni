import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useThemeHex } from '@/theme/colors';
import { REDUCE, easing, spring } from '@/theme/motion';

export interface CheckDrawProps {
  checked: boolean;
  /** Diameter in pt, default 28 */
  size?: number;
  /** Disc fill, default theme accent (hex). */
  discColor?: string;
  /** Tick color, default theme onAccent (hex). */
  checkColor?: string;
  /** Ring shown while unchecked, default theme border. */
  ringColor?: string;
  /** Fired when the draw animation is over. */
  onDone?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Set-done tick: the disc springs in, the tick draws itself (~320 ms total).
 * Unchecking resets instantly (fast path for sweaty hands). Reduce Motion:
 * state changes instantly. Haptics are the caller's job (`haptic.setDone()`).
 */
export function CheckDraw({
  checked,
  size = 28,
  discColor,
  checkColor,
  ringColor,
  onDone,
  style,
}: CheckDrawProps) {
  const accent = useThemeHex('accent');
  const onAccent = useThemeHex('onAccent');
  const border = useThemeHex('border');

  const disc = useSharedValue(checked ? 1 : 0);
  const tick = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    if (!checked) {
      disc.value = withTiming(0, { duration: 90, reduceMotion: REDUCE });
      tick.value = 0;
      return;
    }
    disc.value = withSpring(1, { ...spring.tap, reduceMotion: REDUCE });
    tick.value = withDelay(
      180,
      withTiming(1, {
        duration: 140,
        easing: easing.rise,
        reduceMotion: REDUCE,
      }),
      REDUCE,
    );
    const id = setTimeout(() => onDone?.(), 330);
    return () => clearTimeout(id);
    // onDone intentionally not a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, disc, tick]);

  const path = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(size * 0.28, size * 0.52);
    p.lineTo(size * 0.43, size * 0.67);
    p.lineTo(size * 0.73, size * 0.35);
    return p;
  }, [size]);

  const r = useDerivedValue(() => (size / 2) * disc.value);
  const strokeWidth = Math.max(2, size * 0.09);

  return (
    <Canvas
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, style]}
    >
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 1}
        style="stroke"
        strokeWidth={1.5}
        color={ringColor ?? border}
      />
      <Circle cx={size / 2} cy={size / 2} r={r} color={discColor ?? accent} />
      <Path
        path={path}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
        start={0}
        end={tick}
        color={checkColor ?? onAccent}
      />
    </Canvas>
  );
}
