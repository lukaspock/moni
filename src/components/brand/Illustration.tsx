import type { ReactNode } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useThemeHex } from '@/theme/colors';

import { MiniMark } from './MiniMark';

export type IllustrationName =
  | 'emptyMeals'
  | 'emptyWorkout'
  | 'noData'
  | 'offline'
  | 'error'
  | 'goalReached'
  | 'streak'
  | 'notifications'
  | 'healthPrimer';

export type IllustrationProps = {
  name: IllustrationName;
  /** Width in pt (viewBox 160x120; height = 0.75 * size). Default 180. */
  size?: number;
  /** Line color; defaults to the label color. */
  color?: string;
  accessibilityLabel?: string;
};

type Palette = {
  ink: string;
  accent: string;
  soft: string;
  bonus: string;
  danger: string;
};

const DASH = '3 9';

const SCENES: Record<IllustrationName, (p: Palette) => ReactNode> = {
  emptyMeals: (p) => (
    <>
      <Circle
        cx={80}
        cy={34}
        r={19}
        stroke={p.accent}
        strokeWidth={4}
        strokeDasharray={DASH}
      />
      <MiniMark cx={80} cy={34} r={10} upper={p.accent} lower={p.bonus} />
      <Path d="M34 66H126A46 36 0 0 1 34 66Z" fill={p.soft} />
      <Path d="M60 106H100" />
      <Path d="M138 60V104M133 60V72A5 5 0 0 0 143 72V60" />
    </>
  ),
  emptyWorkout: (p) => (
    <>
      <Circle
        cx={80}
        cy={60}
        r={42}
        stroke={p.accent}
        strokeWidth={4}
        strokeDasharray={DASH}
      />
      <Path d="M60 60H100" />
      <Rect x={46} y={38} width={14} height={44} rx={6} fill={p.soft} />
      <Rect x={100} y={38} width={14} height={44} rx={6} fill={p.soft} />
      <Rect x={34} y={47} width={12} height={26} rx={5} fill={p.accent} />
      <Rect x={114} y={47} width={12} height={26} rx={5} fill={p.accent} />
      <Path d="M26 104H134" opacity={0.35} />
      <MiniMark cx={126} cy={20} r={9} upper={p.accent} lower={p.bonus} />
    </>
  ),
  noData: (p) => (
    <>
      <Path d="M28 98H132" />
      <Rect
        x={38}
        y={66}
        width={18}
        height={32}
        rx={6}
        fill={p.soft}
        strokeDasharray="2 7"
      />
      <Rect
        x={71}
        y={48}
        width={18}
        height={50}
        rx={6}
        fill={p.soft}
        strokeDasharray="2 7"
      />
      <Rect
        x={104}
        y={30}
        width={18}
        height={68}
        rx={6}
        fill={p.soft}
        strokeDasharray="2 7"
      />
      <MiniMark cx={113} cy={16} r={8} upper={p.accent} lower={p.bonus} />
    </>
  ),
  offline: (p) => (
    <>
      <Path
        d="M50 92H112C128 92 136 80 134 68C132 56 120 50 110 52C106 38 92 30 78 34C64 38 58 48 58 56C42 56 34 66 36 76C37 86 44 92 50 92Z"
        fill={p.soft}
      />
      <MiniMark cx={80} cy={68} r={13} upper={p.accent} lower={p.bonus} />
    </>
  ),
  error: (p) => (
    <>
      <Path d="M104 36A38 38 0 0 0 42 62" stroke={p.danger} strokeWidth={7} />
      <Path d="M120 70A38 38 0 0 1 80 98" stroke={p.danger} strokeWidth={7} />
      <Path d="M52 82A38 38 0 0 0 66 94" stroke={p.danger} strokeWidth={7} />
      <Path d="M80 44V68" strokeWidth={6} />
      <Circle cx={80} cy={82} r={3.5} fill={p.ink} stroke="none" />
      <MiniMark cx={124} cy={44} r={7} upper={p.accent} lower={p.bonus} />
    </>
  ),
  goalReached: (p) => (
    <>
      <Circle cx={80} cy={62} r={38} stroke={p.accent} strokeWidth={12} />
      <Path d="M64 63L76 75L98 50" strokeWidth={6} />
      <Path
        d="M120 22L130 12M136 40H148M40 16L34 8M22 44H12"
        stroke={p.bonus}
        strokeWidth={4}
      />
    </>
  ),
  streak: (p) => (
    <>
      <Path d="M20 100H140" opacity={0.35} />
      {(
        [
          [28, 88],
          [46, 82],
          [64, 76],
        ] as const
      ).map(([x, y]) => (
        <Circle key={x} cx={x} cy={y} r={7} fill={p.soft} />
      ))}
      {(
        [
          [82, 68],
          [100, 58],
          [118, 46],
        ] as const
      ).map(([x, y]) => (
        <Circle key={x} cx={x} cy={y} r={7} fill={p.accent} stroke={p.accent} />
      ))}
      <MiniMark cx={136} cy={30} r={11} upper={p.accent} lower={p.bonus} />
    </>
  ),
  notifications: (p) => (
    <>
      <Path
        d="M80 24C62 24 56 40 56 54V68L46 80H114L104 68V54C104 40 98 24 80 24Z"
        fill={p.soft}
      />
      <Path d="M71 90A9 9 0 0 0 89 90" />
      <Path d="M80 24V18" />
      <MiniMark cx={110} cy={30} r={12} upper={p.accent} lower={p.bonus} />
    </>
  ),
  healthPrimer: (p) => (
    <>
      <Circle
        cx={80}
        cy={60}
        r={46}
        stroke={p.accent}
        strokeWidth={4}
        strokeDasharray={DASH}
      />
      <Path
        d="M80 96C44 72 44 38 64 38C73 38 78 44 80 50C82 44 87 38 96 38C116 38 116 72 80 96Z"
        fill={p.soft}
      />
      <Path
        d="M58 64H72L77 54L85 74L90 64H102"
        stroke={p.accent}
        strokeWidth={4}
      />
    </>
  ),
};

/** Line illustrations (viewBox 160x120) for empty/error/celebration states. Decorative unless a label is given. */
export function Illustration({
  name,
  size = 180,
  color,
  accessibilityLabel,
}: IllustrationProps) {
  const label = useThemeHex('label');
  const palette: Palette = {
    ink: color ?? label,
    accent: useThemeHex('accent'),
    soft: useThemeHex('accentSoft'),
    bonus: useThemeHex('bonus'),
    danger: useThemeHex('danger'),
  };
  return (
    <Svg
      width={size}
      height={size * 0.75}
      viewBox="0 0 160 120"
      accessible={accessibilityLabel != null}
      accessibilityLabel={accessibilityLabel}
    >
      <G
        fill="none"
        stroke={palette.ink}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {SCENES[name](palette)}
      </G>
    </Svg>
  );
}
