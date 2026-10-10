import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { G } from 'react-native-svg';

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
  /** Overall opacity (default 0.08). */
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
  opacity = 0.08,
  scale = 1,
  color,
  style,
}: RingPatternProps) {
  const accent = useThemeHex('accent');
  const bonus = useThemeHex('bonus');
  const base = color ?? accent;
  const t = TILE * scale;
  // Tiled by hand: react-native-svg does not apply the marks' clipPaths inside
  // a <Pattern>, which rendered the raw wave bands as blocks.
  const tiles = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < height; y += t) {
      for (let x = 0; x < width; x += t) out.push({ x, y });
    }
    return out;
  }, [width, height, t]);
  return (
    <Svg
      width={width}
      height={height}
      style={style}
      pointerEvents="none"
      accessible={false}
    >
      <G opacity={opacity}>
        {tiles.map(({ x, y }) => (
          <G
            key={`${x}-${y}`}
            transform={`translate(${x} ${y}) scale(${scale})`}
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
          </G>
        ))}
      </G>
    </Svg>
  );
}
