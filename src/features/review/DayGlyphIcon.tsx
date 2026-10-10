import Svg, { Circle, Line } from 'react-native-svg';

import type { DayGlyph } from '@/domain';
import { fixedColors } from '@/theme/colors';

/** Day "ø": ring = food kept, slash = training, dot = confirmed rest day. Fixed hero colors. */
export function DayGlyphIcon({
  glyph,
  size = 36,
  label,
}: {
  glyph: DayGlyph;
  size?: number;
  label?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      accessible={label != null}
      accessibilityLabel={label}
    >
      <Circle
        cx={20}
        cy={20}
        r={13}
        fill="none"
        stroke={glyph.ring ? fixedColors.lime : fixedColors.heroTrack}
        strokeWidth={glyph.ring ? 5 : 2}
      />
      {glyph.slash ? (
        <Line
          x1={9}
          y1={31}
          x2={31}
          y2={9}
          stroke={fixedColors.ember}
          strokeWidth={4.5}
          strokeLinecap="round"
        />
      ) : null}
      {glyph.rest ? (
        <Circle cx={20} cy={20} r={3} fill={fixedColors.heroLabel2} />
      ) : null}
    </Svg>
  );
}
