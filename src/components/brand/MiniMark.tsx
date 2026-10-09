import { useId } from 'react';
import { ClipPath, Circle, Defs, G, Path } from 'react-native-svg';

import { WM_O_BANDS, WM_O_RADIUS } from './markGeometry';

// WM_O_BANDS is drawn around (52, 50) with radius WM_O_RADIUS (single wave).
const CX = 52;
const CY = 50;

type Props = {
  cx: number;
  cy: number;
  r: number;
  upper: string;
  lower: string;
};

/** Small brand disc (single wave) to place inside other SVG scenes. */
export function MiniMark({ cx, cy, r, upper, lower }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const s = r / WM_O_RADIUS;
  return (
    <G
      transform={`translate(${cx} ${cy}) scale(${s}) translate(${-CX} ${-CY})`}
    >
      <Defs>
        <ClipPath id={id}>
          <Circle cx={CX} cy={CY} r={WM_O_RADIUS} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <G rotation={-32} origin={`${CX}, ${CY}`}>
          {WM_O_BANDS.map((b, i) => (
            <Path
              key={i}
              d={b.d}
              fill={b.role === 'upper' ? upper : lower}
              stroke="none"
            />
          ))}
        </G>
      </G>
    </G>
  );
}
