import { useMemo } from 'react';
import { View } from 'react-native';
import {
  Canvas,
  DashPathEffect,
  Path,
  Skia,
  type SkPath,
} from '@shopify/react-native-skia';

const START_ANGLE = -90;
const STROKE_WIDTH = 16;
const OVERFLOW_STROKE_WIDTH = 6;

export interface KcalRingProps {
  /** kcal actually logged today. */
  eatenKcal: number;
  /** base daily target, before any workout bonus. */
  baseKcal: number;
  /** additional allowance from a workout (PLAN §6.4), 0 if none. */
  bonusKcal: number;
  /** true = bonus is a provisional estimate (not yet earned) -> drawn dashed. */
  bonusIsProvisional: boolean;
  size?: number;
}

function arcPath(size: number, strokeWidth: number, startAngle: number, sweepAngle: number): SkPath {
  const path = Skia.Path.Make();
  const inset = strokeWidth / 2;
  const rect = { x: inset, y: inset, width: size - strokeWidth, height: size - strokeWidth };
  path.addArc(rect, startAngle, sweepAngle);
  return path;
}

/**
 * §7.6 kcal ring: eaten vs. total limit (base + workout bonus). The bonus renders as its
 * own segment (dashed while provisional). Going over the limit switches the filled arc to
 * the destructive color and adds a small red overflow ring outside the main track.
 */
export function KcalRing({
  eatenKcal,
  baseKcal,
  bonusKcal,
  bonusIsProvisional,
  size = 220,
}: KcalRingProps) {
  const totalKcal = Math.max(baseKcal + bonusKcal, 1);
  const isOver = eatenKcal > totalKcal;

  // Skia's Canvas paints need concrete color values, not RN's `PlatformColor`
  // opaque handles, so these mirror the iOS system colors directly (no
  // automatic dark-mode adaptation on the canvas itself — a known limitation).
  const trackColor = 'rgba(120,120,128,0.3)';
  const baseFillColor = '#007AFF';
  const bonusFillColor = '#34C759';
  const overColor = '#FF3B30';

  const baseFraction = Math.min(baseKcal / totalKcal, 1);
  const bonusFraction = Math.max(1 - baseFraction, 0);

  const eatenIntoBaseFraction = Math.min(eatenKcal, baseKcal) / totalKcal;
  const eatenIntoBonusFraction =
    bonusKcal > 0 ? Math.min(Math.max(eatenKcal - baseKcal, 0), bonusKcal) / totalKcal : 0;

  const overflowFraction = isOver ? Math.min((eatenKcal - totalKcal) / totalKcal, 1) : 0;

  const paths = useMemo(() => {
    const trackPath = arcPath(size, STROKE_WIDTH, START_ANGLE, 360);
    const baseTrackPath = arcPath(size, STROKE_WIDTH, START_ANGLE, baseFraction * 360);
    const bonusTrackPath = arcPath(
      size,
      STROKE_WIDTH,
      START_ANGLE + baseFraction * 360,
      bonusFraction * 360,
    );
    const eatenBasePath = arcPath(size, STROKE_WIDTH, START_ANGLE, eatenIntoBaseFraction * 360);
    const eatenBonusPath = arcPath(
      size,
      STROKE_WIDTH,
      START_ANGLE + baseFraction * 360,
      eatenIntoBonusFraction * 360,
    );
    const overflowPath = arcPath(
      size,
      OVERFLOW_STROKE_WIDTH,
      START_ANGLE,
      overflowFraction * 360,
    );
    return { trackPath, baseTrackPath, bonusTrackPath, eatenBasePath, eatenBonusPath, overflowPath };
  }, [size, baseFraction, bonusFraction, eatenIntoBaseFraction, eatenIntoBonusFraction, overflowFraction]);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        {/* full background track */}
        <Path
          path={paths.trackPath}
          style="stroke"
          strokeWidth={STROKE_WIDTH}
          strokeCap="round"
          color={trackColor}
        />
        {/* bonus allowance track (outline only), dashed while provisional */}
        {bonusKcal > 0 && (
          <Path
            path={paths.bonusTrackPath}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            strokeCap="round"
            color={bonusFillColor}
            opacity={bonusIsProvisional ? 0.35 : 0.25}
          >
            {bonusIsProvisional && <DashPathEffect intervals={[6, 5]} />}
          </Path>
        )}
        {/* eaten within base */}
        <Path
          path={paths.eatenBasePath}
          style="stroke"
          strokeWidth={STROKE_WIDTH}
          strokeCap="round"
          color={isOver ? overColor : baseFillColor}
        />
        {/* eaten within bonus */}
        {eatenIntoBonusFraction > 0 && (
          <Path
            path={paths.eatenBonusPath}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            strokeCap="round"
            color={isOver ? overColor : bonusFillColor}
          />
        )}
        {/* over-limit overflow indicator, drawn just outside the main ring */}
        {isOver && (
          <Path
            path={paths.overflowPath}
            style="stroke"
            strokeWidth={OVERFLOW_STROKE_WIDTH}
            strokeCap="round"
            color={overColor}
          />
        )}
      </Canvas>
    </View>
  );
}
