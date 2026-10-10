import type { ReactNode } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useThemeHex } from '@/theme/colors';

export type BadgeName = 'firstLog' | 'rhythm7' | 'ringClosed';

export type BadgeProps = {
  name: BadgeName;
  size?: number;
  /** false = not yet earned: outline only, 20 % opacity, dashed rim. */
  earned?: boolean;
  accessibilityLabel?: string;
};

type Palette = { ink: string; accent: string; soft: string; bonus: string };

const DOTS = Array.from({ length: 7 }, (_, i) => {
  const a = (i / 7) * 2 * Math.PI - Math.PI / 2;
  return [60 + 42 * Math.cos(a), 60 + 42 * Math.sin(a)] as const;
});

const MOTIFS: Record<BadgeName, (p: Palette, earned: boolean) => ReactNode> = {
  firstLog: (p, earned) => (
    <>
      <Path d="M34 64H86A26 22 0 0 1 34 64Z" />
      <Path d="M48 92H72" />
      <Path
        d="M50 54C54 46 58 44 62 38M62 54C66 46 70 44 74 38"
        stroke={earned ? p.bonus : p.ink}
        strokeWidth={6}
      />
    </>
  ),
  rhythm7: (p, earned) => (
    <>
      {DOTS.map(([x, y], i) => (
        <Circle
          key={i}
          cx={x}
          cy={y}
          r={3.5}
          fill={earned ? p.accent : p.ink}
          stroke="none"
        />
      ))}
      <Path d="M36 56C44 48 52 48 60 54S76 60 84 52" />
      <Path
        d="M36 72C44 64 52 64 60 70S76 76 84 68"
        stroke={earned ? p.bonus : p.ink}
        strokeWidth={6}
      />
    </>
  ),
  ringClosed: (p, earned) => (
    <>
      <Path
        d="M54.8 30.5A30 30 0 1 0 65.2 30.5"
        stroke={earned ? p.accent : p.ink}
        strokeWidth={12}
      />
      <Path
        d="M54.8 30.5A30 30 0 0 1 65.2 30.5"
        stroke={earned ? p.bonus : p.ink}
        strokeWidth={12}
      />
      <Path d="M50 62L58 70L72 54" strokeWidth={6} />
    </>
  ),
};

/** Round achievement seal (r=54): soft fill, accent rim, one ember stroke. */
export function Badge({
  name,
  size = 96,
  earned = true,
  accessibilityLabel,
}: BadgeProps) {
  const palette: Palette = {
    ink: useThemeHex('label'),
    accent: useThemeHex('accent'),
    soft: useThemeHex('accentSoft'),
    bonus: useThemeHex('bonus'),
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      accessible={accessibilityLabel != null}
      accessibilityLabel={accessibilityLabel}
    >
      <G opacity={earned ? 1 : 0.2}>
        {earned ? <Circle cx={60} cy={60} r={54} fill={palette.soft} /> : null}
        <Circle
          cx={60}
          cy={60}
          r={54}
          fill="none"
          stroke={earned ? palette.accent : palette.ink}
          strokeWidth={6}
          strokeDasharray={earned ? undefined : '3 9'}
          strokeLinecap="round"
        />
        <G
          fill="none"
          stroke={palette.ink}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {MOTIFS[name](palette, earned)}
        </G>
      </G>
    </Svg>
  );
}
