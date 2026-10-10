import { Canvas, Circle } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/motionPrefs';
import { fixedColors } from '@/theme/colors';

import { withAlpha } from './colorAlpha';
import {
  FOAM_MAX_COUNT,
  createFoam,
  foamAlpha,
  foamMaxLifeMs,
  foamRadius,
  foamX,
  foamY,
  type FoamParticle,
} from './foamMath';

export interface FoamProps {
  /** Spawn point, in canvas coordinates. */
  origin: { x: number; y: number };
  /** Canvas size; default fills the parent (absolute). */
  size?: { width: number; height: number };
  /** <= 48, default 24 */
  count?: number;
  /** Hex colors (Skia), default `fixed.foam`. */
  colors?: string[];
  /** Horizontal spread px/s, default 18 */
  spread?: number;
  /** Rise speed px/s, default 60..120 */
  riseMin?: number;
  riseMax?: number;
  /** Lifetime ms, default 900..1300 */
  lifeMin?: number;
  lifeMax?: number;
  /** Fixed seed (tests/previews); default random per mount. */
  seed?: number;
  /** Called when the burst is over (unmount the component then). */
  onDone?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Foam (Gischt): light dots rise from `origin`, slow down, shrink and fade.
 * One Skia canvas, closed-form positions driven by a single timing value
 * (no JS frames). Decorative: hidden from accessibility. Reduce Motion: a
 * static, faint cluster of dots for ~1.2 s, no movement.
 */
export function Foam({
  origin,
  size,
  count = 24,
  colors,
  spread,
  riseMin,
  riseMax,
  lifeMin,
  lifeMax,
  seed,
  onDone,
  style,
}: FoamProps) {
  const reduce = useReduceMotion();
  const palette = colors && colors.length > 0 ? colors : [fixedColors.foam];
  const [autoSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const particles = useMemo(
    () =>
      createFoam({
        origin,
        count: Math.min(count, FOAM_MAX_COUNT),
        spread,
        riseMin,
        riseMax,
        lifeMinMs: lifeMin,
        lifeMaxMs: lifeMax,
        paletteSize: palette.length,
        seed: seed ?? autoSeed,
      }),
    // palette identity changes every render; its length is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      origin.x,
      origin.y,
      count,
      spread,
      riseMin,
      riseMax,
      lifeMin,
      lifeMax,
      seed,
      autoSeed,
      palette.length,
    ],
  );

  const totalMs = foamMaxLifeMs(particles) + 100;
  const time = useSharedValue(0);

  useEffect(() => {
    if (!reduce) {
      time.value = withTiming(totalMs / 1000, {
        duration: totalMs,
        easing: Easing.linear,
      });
    }
    const id = setTimeout(() => onDone?.(), reduce ? 1200 : totalMs);
    return () => clearTimeout(id);
  }, [reduce, totalMs, time, onDone]);

  return (
    <Canvas
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[size ?? StyleSheet.absoluteFill, style]}
    >
      {reduce
        ? particles
            .slice(0, 6)
            .map((p, i) => (
              <Circle
                key={i}
                cx={foamX(p, 0.35)}
                cy={foamY(p, 0.35)}
                r={2}
                color={withAlpha(palette[p.colorIndex % palette.length], 0.5)}
              />
            ))
        : particles.map((p, i) => (
            <FoamDot
              key={i}
              p={p}
              time={time}
              color={palette[p.colorIndex % palette.length]}
            />
          ))}
    </Canvas>
  );
}

function FoamDot({
  p,
  time,
  color,
}: {
  p: FoamParticle;
  time: SharedValue<number>;
  color: string;
}) {
  const cx = useDerivedValue(() => foamX(p, time.value));
  const cy = useDerivedValue(() => foamY(p, time.value));
  const r = useDerivedValue(() => foamRadius(p, time.value));
  const haloR = useDerivedValue(() => foamRadius(p, time.value) * 2.4);
  const alpha = useDerivedValue(() => foamAlpha(p, time.value));
  const haloAlpha = useDerivedValue(() => foamAlpha(p, time.value) * 0.22);
  return (
    <>
      <Circle cx={cx} cy={cy} r={haloR} color={color} opacity={haloAlpha} />
      <Circle cx={cx} cy={cy} r={r} color={color} opacity={alpha} />
    </>
  );
}
