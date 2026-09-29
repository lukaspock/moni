import { Canvas, Circle, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import type { ProjectionPoint } from '@/domain';
import { useThemeHex } from '@/theme/colors';

const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 14;

/**
 * Projected weight curve (result screen). Points come from
 * `src/domain/projection.ts::projectWeightCurve`; this only maps them to
 * pixels and draws them with Skia: a line that "draws itself" (animated
 * `end`, ~900 ms — instant under Reduce Motion), a soft gradient fill and a
 * dot at the goal. Colors via `useThemeHex` (Skia can't take PlatformColor).
 */
export function WeightProjectionChart({
  points,
  startLabel,
  endLabel,
  endCaption,
  height = 170,
}: {
  points: ProjectionPoint[];
  startLabel: string;
  endLabel: string;
  endCaption?: string;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const accent = useThemeHex('accent');
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(150, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [progress]);

  const geometry = useMemo(() => {
    if (width === 0 || points.length < 2) return null;
    const maxWeek = points[points.length - 1].week || 1;
    const weights = points.map((p) => p.weightKg);
    let minW = Math.min(...weights);
    let maxW = Math.max(...weights);
    if (maxW - minW < 1) {
      minW -= 0.5;
      maxW += 0.5;
    }
    const innerW = width - PAD_X * 2;
    const innerH = height - PAD_TOP - PAD_BOTTOM;
    const toXY = (p: ProjectionPoint) => ({
      x: PAD_X + (p.week / maxWeek) * innerW,
      y: PAD_TOP + ((maxW - p.weightKg) / (maxW - minW)) * innerH,
    });
    const xy = points.map(toXY);

    const line = Skia.Path.Make();
    xy.forEach((pt, i) => (i === 0 ? line.moveTo(pt.x, pt.y) : line.lineTo(pt.x, pt.y)));

    const fill = line.copy();
    fill.lineTo(xy[xy.length - 1].x, height);
    fill.lineTo(xy[0].x, height);
    fill.close();

    // The goal is the second-to-last point (the last one is the flat "maintain" tail).
    const goal = xy.length > 2 ? xy[xy.length - 2] : xy[xy.length - 1];
    return { line, fill, start: xy[0], goal };
  }, [points, width, height]);

  const goalOpacity = useDerivedValue(() => (progress.value > 0.85 ? (progress.value - 0.85) / 0.15 : 0));
  const fillOpacity = useDerivedValue(() => progress.value);

  return (
    <View className="gap-2">
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {geometry ? (
          <Canvas style={{ width, height }}>
            <Path path={geometry.fill} opacity={fillOpacity}>
              <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[`${accent}55`, `${accent}00`]} />
            </Path>
            <Path
              path={geometry.line}
              style="stroke"
              strokeWidth={4}
              strokeCap="round"
              strokeJoin="round"
              color={accent}
              start={0}
              end={progress}
            />
            <Circle cx={geometry.start.x} cy={geometry.start.y} r={5} color={accent} />
            <Circle cx={geometry.goal.x} cy={geometry.goal.y} r={8} color={accent} opacity={goalOpacity} />
            <Circle cx={geometry.goal.x} cy={geometry.goal.y} r={3.5} color="white" opacity={goalOpacity} />
          </Canvas>
        ) : null}
      </View>
      <View className="flex-row items-start justify-between">
        <Text className="text-sm font-semibold text-secondary-label">{startLabel}</Text>
        <View className="items-end">
          <Text className="text-sm font-semibold text-tint">{endLabel}</Text>
          {endCaption ? <Text className="text-xs text-secondary-label">{endCaption}</Text> : null}
        </View>
      </View>
    </View>
  );
}
