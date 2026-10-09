import { Blur, Group, Paint } from '@shopify/react-native-skia';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/motionPrefs';
import { easing, glow } from '@/theme/motion';

export interface GlowPulseProps {
  /** Increment to fire a pulse. */
  trigger: number;
  /** Hex (Skia). Children inherit it as their paint color. */
  color: string;
  /** Default 0.55 */
  peak?: number;
  /** Idle level, default 0.18 */
  base?: number;
  attackMs?: number;
  decayMs?: number;
  /** Blur sigma, default 10 (create once, only opacity is animated). */
  blur?: number;
  /** Shape(s) that glow, e.g. a copy of the ring path. */
  children: ReactNode;
}

/**
 * Skia child for an existing Canvas: blurred copy of `children` whose opacity
 * pulses (fast attack, long decay) on `trigger` and breathes very gently while
 * idle. Reduce Motion: static at `base`, no breathing.
 */
/** Outside the component: shared values are mutated imperatively. */
function resetLevel(level: SharedValue<number>, to: number): void {
  level.value = to;
}

export function GlowPulse({
  trigger,
  color,
  peak = 0.55,
  base = 0.18,
  attackMs = glow.attack,
  decayMs = glow.decay,
  blur = 10,
  children,
}: GlowPulseProps) {
  const reduce = useReduceMotion();
  const level = useSharedValue(base);
  const idle = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) {
      level.value = base;
      return;
    }
    level.value = withSequence(
      withTiming(peak, { duration: attackMs, easing: easing.rise }),
      withTiming(base, { duration: decayMs, easing: easing.settle }),
    );
    // only `trigger` fires a pulse
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  useEffect(() => {
    if (reduce) {
      cancelAnimation(idle);
      idle.value = 0;
      resetLevel(level, base);
      return;
    }
    idle.value = withRepeat(
      withTiming(1, { duration: glow.idlePeriod / 2, easing: easing.smooth }),
      -1,
      true,
    );
    return () => cancelAnimation(idle);
  }, [reduce, idle, level, base]);

  const opacity = useDerivedValue(() => level.value * (1 - 0.15 * idle.value));

  return (
    <Group
      color={color}
      opacity={opacity}
      layer={
        <Paint>
          <Blur blur={blur} />
        </Paint>
      }
    >
      {children}
    </Group>
  );
}
