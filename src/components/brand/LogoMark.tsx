import { useId } from 'react';
import Svg, { ClipPath, Circle, Defs, G, Path } from 'react-native-svg';

import { fixedColors, useThemeHex } from '@/theme/colors';

import { MARK_BANDS, MARK_RADIUS, MARK_ROTATE } from './markGeometry';

export type LogoMarkVariant = 'color' | 'mono' | 'adaptive';

export type LogoMarkProps = {
  size?: number;
  /**
   * `color` = fixed lime/ember (dark backgrounds, store art), `mono` = one color with the
   * gaps kept, `adaptive` = theme accent/bonus (same as the native splash).
   */
  variant?: LogoMarkVariant;
  /** Mono color; defaults to the label color. */
  color?: string;
  /** Hide from VoiceOver (use next to a visible "møni" text). */
  decorative?: boolean;
};

export function LogoMark({
  size = 96,
  variant = 'color',
  color,
  decorative = false,
}: LogoMarkProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const label = useThemeHex('label');
  const accent = useThemeHex('accent');
  const bonus = useThemeHex('bonus');
  const upper =
    variant === 'color'
      ? fixedColors.lime
      : variant === 'adaptive'
        ? accent
        : (color ?? label);
  const lower =
    variant === 'color'
      ? fixedColors.ember
      : variant === 'adaptive'
        ? bonus
        : (color ?? label);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 1000 1000"
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : 'møni'}
    >
      <Defs>
        <ClipPath id={id}>
          <Circle cx={500} cy={500} r={MARK_RADIUS} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <G rotation={MARK_ROTATE} origin="500, 500">
          {MARK_BANDS.map((b, i) => (
            <Path key={i} d={b.d} fill={b.role === 'upper' ? upper : lower} />
          ))}
        </G>
      </G>
    </Svg>
  );
}
