import { useMemo, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Circle, DashPathEffect, Path, Skia } from '@shopify/react-native-skia';

import { dayNumber, type WeightPoint } from '@/domain';
import { useThemeHex } from '@/theme/colors';

const PAD_X = 8;
const PAD_Y = 14;

export interface WeightTrendChartProps {
  /** daily raw points (range-filtered), ascending */
  raw: readonly WeightPoint[];
  /** smoothed trend (range-filtered), ascending */
  trend: readonly WeightPoint[];
  targetKg?: number | null;
  /** formats a kg value for the axis labels (unit conversion happens in the caller) */
  formatWeight: (kg: number) => string;
  height?: number;
}

/**
 * Raw weigh-ins as dots, the smoothed trend as a line and an optional dashed
 * target line. Skia can't take PlatformColor, so brand colors come from
 * `useThemeHex`. Axis labels are plain RN Text overlays (no Skia fonts needed).
 */
export function WeightTrendChart({ raw, trend, targetKg, formatWeight, height = 200 }: WeightTrendChartProps) {
  const [width, setWidth] = useState(0);
  const accent = useThemeHex('accent');
  const danger = useThemeHex('danger');
  const dotColor = 'rgba(120,120,128,0.55)';
  const gridColor = 'rgba(120,120,128,0.2)';

  const geometry = useMemo(() => {
    if (width === 0 || raw.length === 0) return null;
    const all = [...raw.map((p) => p.weightKg), ...trend.map((p) => p.weightKg)];
    if (targetKg != null) all.push(targetKg);
    let min = Math.min(...all);
    let max = Math.max(...all);
    const span = Math.max(max - min, 1);
    min -= span * 0.1;
    max += span * 0.1;
    const days = [...raw, ...trend].map((p) => dayNumber(p.date));
    const d0 = Math.min(...days);
    const d1 = Math.max(...days);
    const plotW = width - PAD_X * 2;
    const plotH = height - PAD_Y * 2;
    const x = (date: string) => (d1 === d0 ? width / 2 : PAD_X + ((dayNumber(date) - d0) / (d1 - d0)) * plotW);
    const y = (kg: number) => PAD_Y + (1 - (kg - min) / (max - min)) * plotH;

    const trendPath = Skia.Path.Make();
    trend.forEach((p, i) => {
      if (i === 0) trendPath.moveTo(x(p.date), y(p.weightKg));
      else trendPath.lineTo(x(p.date), y(p.weightKg));
    });
    const targetPath = Skia.Path.Make();
    if (targetKg != null) {
      targetPath.moveTo(PAD_X, y(targetKg));
      targetPath.lineTo(width - PAD_X, y(targetKg));
    }
    return {
      min,
      max,
      y,
      trendPath,
      targetPath,
      dots: raw.map((p) => ({ cx: x(p.date), cy: y(p.weightKg) })),
      gridYs: [0, 1, 2].map((i) => PAD_Y + (i / 2) * plotH),
      gridValues: [0, 1, 2].map((i) => max - (i / 2) * (max - min)),
    };
  }, [width, height, raw, trend, targetKg]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width));

  return (
    <View style={{ height }} onLayout={onLayout}>
      {geometry && (
        <>
          <Canvas style={{ width, height }}>
            {geometry.gridYs.map((gy) => {
              const p = Skia.Path.Make();
              p.moveTo(PAD_X, gy);
              p.lineTo(width - PAD_X, gy);
              return <Path key={gy} path={p} style="stroke" strokeWidth={1} color={gridColor} />;
            })}
            {targetKg != null && (
              <Path path={geometry.targetPath} style="stroke" strokeWidth={1.5} color={danger}>
                <DashPathEffect intervals={[6, 5]} />
              </Path>
            )}
            {geometry.dots.map((d, i) => (
              <Circle key={i} cx={d.cx} cy={d.cy} r={3} color={dotColor} />
            ))}
            {trend.length > 1 && (
              <Path
                path={geometry.trendPath}
                style="stroke"
                strokeWidth={3}
                strokeCap="round"
                strokeJoin="round"
                color={accent}
              />
            )}
          </Canvas>
          {geometry.gridYs.map((gy, i) => (
            <Text
              key={gy}
              pointerEvents="none"
              className="absolute right-2 text-[10px] text-secondary-label"
              style={{ top: gy - 13 }}
            >
              {formatWeight(geometry.gridValues[i])}
            </Text>
          ))}
        </>
      )}
    </View>
  );
}
