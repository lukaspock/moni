import { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, G, Pattern, Rect } from 'react-native-svg';

import { useThemeHex } from '@/theme/colors';

import { MiniMark } from './MiniMark';

const TILE = 240;

// [cx, cy, r, ember?] - seamless: nothing crosses the tile edge.
const CELLS: readonly (readonly [number, number, number, boolean])[] = [
  [30, 30, 20, false],
  [92, 30, 12, true],
  [210, 30, 17, false],
  [30, 90, 9, false],
  [150, 90, 22, false],
  [210, 90, 11, true],
  [30, 150, 18, false],
  [92, 150, 13, false],
  [150, 150, 8, false],
  [90, 210, 21, true],
  [150, 210, 11, false],
  [210, 210, 15, false],
];

export type RingPatternProps = {
  width: number;
  height: number;
  /** Overall opacity (default 0.12). */
  opacity?: number;
  /** Tile scale (default 1 = 240 pt tile). */
  scale?: number;
  /** Mark color; defaults to the theme accent. */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Seamless, decorative field of small brand marks. */
export function RingPattern({
  width,
  height,
  opacity = 0.12,
  scale = 1,
  color,
  style,
}: RingPatternProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const accent = useThemeHex('accent');
  const bonus = useThemeHex('bonus');
  const base = color ?? accent;
  const t = TILE * scale;
  return (
    <Svg
      width={width}
      height={height}
      style={style}
      pointerEvents="none"
      accessible={false}
    >
      <Defs>
        <Pattern
          id={id}
          width={t}
          height={t}
          patternUnits="userSpaceOnUse"
          viewBox={`0 0 ${TILE} ${TILE}`}
        >
          {CELLS.map(([cx, cy, r, ember], i) => (
            <MiniMark
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              upper={base}
              lower={ember ? bonus : base}
            />
          ))}
        </Pattern>
      </Defs>
      <G opacity={opacity}>
        <Rect width={width} height={height} fill={`url(#${id})`} />
      </G>
    </Svg>
  );
}
