import type { TextProps } from 'react-native';

import { CountText } from '@/components/motion';

/**
 * Number that counts up/down to `value` (ease-out cubic, ~700 ms). Runs on
 * the UI thread via `CountText` (no setState per frame) and jumps straight to
 * the value when Reduce Motion is on. Pure presentation — the value itself is
 * computed in `src/domain`.
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
  return (
    <CountText
      value={value}
      duration={duration}
      startFrom={startFrom}
      format={format}
      {...textProps}
    />
  );
}
