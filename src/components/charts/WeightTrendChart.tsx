import { useEffect, useMemo, useState } from 'react';
import {
  Text,
  View,
  useColorScheme,
  type LayoutChangeEvent,
} from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  DashPathEffect,
  LinearGradient,
  Path,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { dayNumber, type WeightPoint } from '@/domain';
import { fixedColors, useThemeHex } from '@/theme/colors';
import { duration, easing, REDUCE } from '@/theme/motion';
import { fontFamily, maxFontSizeMultiplier } from '@/theme/typography';

import {
  paddedDomain,
  smoothSegments,
  withAlpha,
  type Pt,
} from './charts.logic';

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
  /**
   * `card` (default): themed colors for a surface card. `hero`: fixed colors for
   * the dark hero block (lime line, light labels).
   */
  variant?: 'card' | 'hero';
  /** Optional caption drawn at the target line, e.g. "Ziel 78 kg" (caller localizes). */
  targetLabel?: string;
}

/**
 * Raw weigh-ins as small dots, the smoothed trend as a Catmull-Rom line with a
 * gradient area below and a glowing head point, plus an optional dashed target
 * line. Skia can't take PlatformColor → hex via `useThemeHex` / `fixedColors`.
 * Axis labels are tabular RN Text overlays.
 */
export function WeightTrendChart({
  raw,
  trend,
  targetKg,
  formatWeight,
  height = 200,
  variant = 'card',
  targetLabel,
}: WeightTrendChartProps) {
  const [width, setWidth] = useState(0);
  const reduceMotion = useReducedMotion();
  const dark = useColorScheme() === 'dark';
  const hero = variant === 'hero';

  const accentTheme = useThemeHex('accent');
  const tertiary = useThemeHex('labelTertiary');
  const secondary = useThemeHex('labelSecondary');
  const separator = useThemeHex('separator');
  const surface = useThemeHex('surface');

  const lineColor = hero ? fixedColors.lime : accentTheme;
  const headColor = hero ? fixedColors.limeHead : accentTheme;
  const gridColor = hero ? 'rgba(245,242,234,0.10)' : separator;
  const dotColor = hero ? 'rgba(245,242,234,0.35)' : tertiary;
  const axisColor = hero ? fixedColors.heroLabel2 : tertiary;
  const targetColor = hero ? fixedColors.heroLabel2 : secondary;
  const ringColor = hero ? fixedColors.forest : surface;
  const showGlowHead = hero || dark;

  const geometry = useMemo(() => {
    if (width === 0 || raw.length === 0) return null;
    const values = [
      ...raw.map((p) => p.weightKg),
      ...trend.map((p) => p.weightKg),
    ];
    if (targetKg != null) values.push(targetKg);
    const { min, max } = paddedDomain(values, 0.1, 1);
    const days = [...raw, ...trend].map((p) => dayNumber(p.date));
    const d0 = Math.min(...days);
    const d1 = Math.max(...days);
    const plotW = width - PAD_X * 2;
    const plotH = height - PAD_Y * 2;
    const x = (date: string) =>
      d1 === d0
        ? width / 2
        : PAD_X + ((dayNumber(date) - d0) / (d1 - d0)) * plotW;
    const y = (kg: number) => PAD_Y + (1 - (kg - min) / (max - min)) * plotH;

    const pts: Pt[] = trend.map((p) => ({ x: x(p.date), y: y(p.weightKg) }));
    const trendPath = Skia.Path.Make();
    const areaPath = Skia.Path.Make();
    if (pts.length > 0) {
      trendPath.moveTo(pts[0].x, pts[0].y);
      for (const s of smoothSegments(pts, 0.5)) {
        trendPath.cubicTo(s.cp1.x, s.cp1.y, s.cp2.x, s.cp2.y, s.to.x, s.to.y);
      }
      areaPath.addPath(trendPath);
      areaPath.lineTo(pts[pts.length - 1].x, height - PAD_Y);
      areaPath.lineTo(pts[0].x, height - PAD_Y);
      areaPath.close();
    }
    const targetPath = Skia.Path.Make();
    const targetY = targetKg != null ? y(targetKg) : 0;
    if (targetKg != null) {
      targetPath.moveTo(PAD_X, targetY);
      targetPath.lineTo(width - PAD_X, targetY);
    }
    const headPt =
      pts[pts.length - 1] ??
      (raw.length > 0
        ? { x: x(raw[raw.length - 1].date), y: y(raw[raw.length - 1].weightKg) }
        : null);
    return {
      trendPath,
      areaPath,
      targetPath,
      targetY,
      headPt,
      dots: raw.map((p) => ({ cx: x(p.date), cy: y(p.weightKg) })),
      gridYs: [0, 1, 2].map((i) => PAD_Y + (i / 2) * plotH),
      gridValues: [0, 1, 2].map((i) => max - (i / 2) * (max - min)),
    };
  }, [width, height, raw, trend, targetKg]);

  // Draw-in: line traces left → right, area + head fade in after it.
  const progress = useSharedValue(0);
  const reveal = useSharedValue(0);
  const ready = geometry != null;
  useEffect(() => {
    if (!ready) return;
    if (reduceMotion) {
      progress.value = 1;
      reveal.value = 1;
      return;
    }
    progress.value = 0;
    reveal.value = 0;
    progress.value = withTiming(1, {
      duration: duration.hero,
      easing: easing.rise,
      reduceMotion: REDUCE,
    });
    reveal.value = withDelay(
      duration.slow,
      withTiming(1, { duration: duration.slow, reduceMotion: REDUCE }),
    );
  }, [ready, trend, reduceMotion, progress, reveal]);
  const headOpacity = useDerivedValue(() => reveal.value);
  const glowOpacity = useDerivedValue(() => reveal.value * 0.4);

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(Math.floor(e.nativeEvent.layout.width));

  return (
    <View style={{ height }} onLayout={onLayout}>
      {geometry && (
        <>
          <Canvas style={{ width, height }}>
            {geometry.gridYs.map((gy) => {
              const p = Skia.Path.Make();
              p.moveTo(PAD_X, gy);
              p.lineTo(width - PAD_X, gy);
              return (
                <Path
                  key={gy}
                  path={p}
                  style="stroke"
                  strokeWidth={1}
                  color={gridColor}
                />
              );
            })}
            {targetKg != null && (
              <Path
                path={geometry.targetPath}
                style="stroke"
                strokeWidth={1}
                color={targetColor}
              >
                <DashPathEffect intervals={[6, 5]} />
              </Path>
            )}
            {trend.length > 1 && (
              <Path path={geometry.areaPath} style="fill" opacity={headOpacity}>
                <LinearGradient
                  start={vec(0, PAD_Y)}
                  end={vec(0, height - PAD_Y)}
                  colors={[withAlpha(lineColor, 0.28), withAlpha(lineColor, 0)]}
                />
              </Path>
            )}
            {geometry.dots.map((d, i) => (
              <Circle key={i} cx={d.cx} cy={d.cy} r={2.5} color={dotColor} />
            ))}
            {trend.length > 1 && (
              <Path
                path={geometry.trendPath}
                style="stroke"
                strokeWidth={3}
                strokeCap="round"
                strokeJoin="round"
                color={lineColor}
                start={0}
                end={progress}
              />
            )}
            {geometry.headPt && (
              <>
                {showGlowHead && (
                  <Circle
                    cx={geometry.headPt.x}
                    cy={geometry.headPt.y}
                    r={10}
                    color={headColor}
                    opacity={glowOpacity}
                  >
                    <BlurMask blur={8} style="normal" />
                  </Circle>
                )}
                <Circle
                  cx={geometry.headPt.x}
                  cy={geometry.headPt.y}
                  r={8}
                  color={ringColor}
                  opacity={headOpacity}
                />
                <Circle
                  cx={geometry.headPt.x}
                  cy={geometry.headPt.y}
                  r={5}
                  color={headColor}
                  opacity={headOpacity}
                />
              </>
            )}
          </Canvas>
          {geometry.gridYs.map((gy, i) => (
            <Text
              key={gy}
              pointerEvents="none"
              className="absolute right-2"
              style={{
                top: gy - 14,
                color: axisColor,
                fontFamily: fontFamily.display,
                fontSize: 11,
                fontVariant: ['tabular-nums'],
              }}
              maxFontSizeMultiplier={maxFontSizeMultiplier.numeric}
            >
              {formatWeight(geometry.gridValues[i])}
            </Text>
          ))}
          {targetKg != null && targetLabel != null && (
            <Text
              pointerEvents="none"
              className="absolute right-2"
              style={{
                top: geometry.targetY + 2,
                color: targetColor,
                fontSize: 11,
                fontVariant: ['tabular-nums'],
              }}
            >
              {targetLabel}
            </Text>
          )}
        </>
      )}
    </View>
  );
}
