import { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * Number that counts up/down to `value` (ease-out cubic, ~700 ms). Jumps
 * straight to the value when Reduce Motion is on. Pure presentation — the
 * value itself is computed in `src/domain`.
 */
export function CountUpText({
  value,
  duration = 700,
  startFrom,
  format = (v) => String(Math.round(v)),
  ...textProps
}: {
  value: number;
  duration?: number;
  /** initial displayed value (defaults to `value` = no animation on mount) */
  startFrom?: number;
  format?: (v: number) => string;
} & Omit<TextProps, 'children'>) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => startFrom ?? value);
  const displayRef = useRef(startFrom ?? value);

  useEffect(() => {
    const from = displayRef.current;
    const to = value;
    if (from === to) return;
    const total = reduceMotion ? 0 : duration;
    const startedAt = Date.now();
    let frame = 0;

    const tick = () => {
      const t = total === 0 ? 1 : Math.min((Date.now() - startedAt) / total, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduceMotion]);

  return (
    <Text accessibilityLabel={format(value)} {...textProps}>
      {format(display)}
    </Text>
  );
}
