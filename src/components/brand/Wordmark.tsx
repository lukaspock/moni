import { useId } from 'react';
import Svg, { ClipPath, Circle, Defs, G, Path } from 'react-native-svg';

import { fixedColors, useThemeHex } from '@/theme/colors';

import { WM_O_BANDS, WM_O_RADIUS } from './markGeometry';

const VB_W = 402;
const VB_H = 158;
const SW = 22;

export type WordmarkProps = {
  /** Rendered width in pt (height follows the aspect ratio). */
  width?: number;
  /** Letter color; defaults to the label color. */
  color?: string;
  /** Color the ø (lime/ember) instead of using the letter color. */
  colorMark?: boolean;
  decorative?: boolean;
};

/** "møni" as drawn paths; the ø is a miniature of the logo mark. */
export function Wordmark({
  width = 120,
  color,
  colorMark = false,
  decorative = false,
}: WordmarkProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const label = useThemeHex('label');
  const ink = color ?? label;
  const upper = colorMark ? fixedColors.lime : ink;
  const lower = colorMark ? fixedColors.ember : ink;
  const m = 120;
  const n = 268;
  const i = 360;

  return (
    <Svg
      width={width}
      height={(width * VB_H) / VB_W}
      viewBox={`-8 -50 ${VB_W} ${VB_H}`}
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : 'møni'}
    >
      <Defs>
        <ClipPath id={id}>
          <Circle cx={52} cy={50} r={WM_O_RADIUS} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <G rotation={-32} origin="52, 50">
          {WM_O_BANDS.map((b, k) => (
            <Path key={k} d={b.d} fill={b.role === 'upper' ? upper : lower} />
          ))}
        </G>
      </G>
      <G
        stroke={ink}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <Path
          d={`M${m + 11} 11V89M${m + 11} 39A28 28 0 0 1 ${m + 67} 39V89M${m + 67} 39A28 28 0 0 1 ${m + 123} 39V89`}
        />
        <Path d={`M${n + 11} 11V89M${n + 11} 39A28 28 0 0 1 ${n + 67} 39V89`} />
        <Path d={`M${i + 11} 11V89`} />
      </G>
      <Circle cx={i + 11} cy={-30} r={13} fill={ink} />
    </Svg>
  );
}
