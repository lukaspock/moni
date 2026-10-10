import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Path,
  Skia,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import {
  interpolateColor,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { computeKcalRingModel } from '@/domain';
import { fixedColors } from '@/theme/colors';
import { duration, easing, glow, REDUCE, spring } from '@/theme/motion';
import { maxFontSizeMultiplier, textStyles } from '@/theme/typography';

import {
  bonusTrackEnd,
  clamp01,
  ringGeometry,
  ringPoint,
  ringSegments,
} from './charts.logic';

const STROKE_WIDTH = 22;
const c = fixedColors;

export interface KcalRingCenterInfo {
  /** absolute remaining (or over) kcal, rounded */
  value: number;
  isOver: boolean;
  /** localized "kcal left" / "kcal over" */
  label: string;
  eatenKcal: number;
  limitKcal: number;
}

export interface KcalRingProps {
  /** kcal actually logged. */
  eatenKcal: number;
  /** base daily target, before any workout bonus. */
  baseKcal: number;
  /** additional allowance from a workout (PLAN §6.4), 0 if none. */
  bonusKcal: number;
  size?: number;
  /**
   * Replaces the default center number (e.g. a `RollingNumber`). Gets the
   * resolved values; the label lines below stay rendered by the ring.
   */
  renderCenter?: (info: KcalRingCenterInfo) => ReactNode;
}

/**
 * Today kcal ring (identity v2, always on the dark hero card → fixed colors).
 * 22-pt stroke, sweep gradient lime → foam, soft glow, round head dot, bonus
 * segment in ember that streams in. Over the limit the ring calmly warms to
 * ember — no red, no warning haptics. Values animate with `spring.settle`;
 * Reduced Motion sets them directly.
 */
export function KcalRing({
  eatenKcal,
  baseKcal,
  bonusKcal,
  size = 264,
  renderCenter,
}: KcalRingProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const model = computeKcalRingModel({ eatenKcal, baseKcal, bonusKcal });
  const hasBonus = model.bonusShare > 0;
  const { cx, cy, r } = ringGeometry(size, STROKE_WIDTH);

  const fill = useSharedValue(0);
  const bonusT = useSharedValue(0);
  const overT = useSharedValue(0);
  const base = useSharedValue(model.baseShare);
  const pulse = useSharedValue(1);
  const glowOn = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    base.value = model.baseShare;
  }, [base, model.baseShare]);

  useEffect(() => {
    const target = model.fillShare;
    if (reduceMotion) {
      fill.value = target;
    } else if (first.current) {
      fill.value = withTiming(target, {
        duration: duration.hero,
        easing: easing.rise,
        reduceMotion: REDUCE,
      });
    } else {
      fill.value = withSpring(target, {
        ...spring.settle,
        reduceMotion: REDUCE,
      });
    }
    first.current = false;
  }, [fill, model.fillShare, reduceMotion]);

  useEffect(() => {
    const target = hasBonus ? 1 : 0;
    bonusT.value = reduceMotion
      ? target
      : withDelay(
          hasBonus ? duration.base : 0,
          withTiming(target, {
            duration: duration.slow,
            easing: easing.rise,
            reduceMotion: REDUCE,
          }),
        );
  }, [bonusT, hasBonus, reduceMotion]);

  useEffect(() => {
    const target = model.isOver ? 1 : 0;
    overT.value = reduceMotion
      ? target
      : withTiming(target, {
          duration: duration.slow,
          easing: easing.settle,
          reduceMotion: REDUCE,
        });
  }, [overT, model.isOver, reduceMotion]);

  // Glow: quick attack, long decay (D2 "Gezeiten": soft, no flicker).
  useEffect(() => {
    const target = model.fillShare > 0.02 ? 1 : 0;
    glowOn.value = reduceMotion
      ? target
      : withTiming(target, {
          duration: target ? glow.attack : glow.decay,
          reduceMotion: REDUCE,
        });
  }, [glowOn, model.fillShare, reduceMotion]);

  // Idle: head breathes (0.85 ↔ 1), only without Reduce Motion.
  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.85, {
          duration: glow.idlePeriod / 2,
          easing: easing.smooth,
        }),
        withTiming(1, { duration: glow.idlePeriod / 2, easing: easing.smooth }),
      ),
      -1,
    );
  }, [pulse, reduceMotion]);

  const circle = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(cx, cy, r);
    return path;
  }, [cx, cy, r]);

  const fillClamped = useDerivedValue(() => clamp01(fill.value));
  const baseEnd = useDerivedValue(
    () => ringSegments(fillClamped.value, base.value).baseEnd,
  );
  const bonusStart = useDerivedValue(() => base.value);
  const bonusFillEnd = useDerivedValue(
    () => ringSegments(fillClamped.value, base.value).bonusEnd,
  );
  const bonusFillOpacity = useDerivedValue(() =>
    ringSegments(fillClamped.value, base.value).inBonus ? 1 : 0,
  );
  const bonusTrackEndV = useDerivedValue(() =>
    bonusTrackEnd(base.value, bonusT.value),
  );
  const bonusTrackOpacity = useDerivedValue(() =>
    bonusT.value > 0 ? 0.28 : 0,
  );

  // Gradient follows the fill so the head is always the brightest point.
  const sweepEnd = useDerivedValue(
    () => Math.max(fillClamped.value, 0.02) * 360,
  );
  const mainColors = useDerivedValue(() => [
    interpolateColor(overT.value, [0, 1], [c.limeStart, c.ember]),
    interpolateColor(overT.value, [0, 1], [c.limeMid, c.emberHead]),
    interpolateColor(overT.value, [0, 1], [c.limeHead, c.emberHead]),
  ]);
  const glowColor = useDerivedValue(() =>
    interpolateColor(overT.value, [0, 1], [c.lime, c.ember]),
  );
  const headColor = useDerivedValue(() =>
    ringSegments(fillClamped.value, base.value).inBonus || overT.value > 0.5
      ? c.emberHead
      : c.limeHead,
  );
  const head = useDerivedValue(() => ringPoint(cx, cy, r, fillClamped.value));
  const headX = useDerivedValue(() => head.value.x);
  const headY = useDerivedValue(() => head.value.y);
  const glowSoft = useDerivedValue(() => glowOn.value * 0.22);
  const glowHead = useDerivedValue(() => glowOn.value * 0.45 * pulse.value);
  const headOpacity = useDerivedValue(() =>
    fill.value > 0.005 ? 1 : 0.5 * pulse.value,
  );
  const gapX = useMemo(
    () => ringPoint(cx, cy, r, model.baseShare),
    [cx, cy, r, model.baseShare],
  );

  const remainingAbs = Math.abs(model.remainingKcal);
  const centerLabel = model.isOver
    ? t('food.dashboard.kcalOver')
    : t('food.dashboard.kcalLeft');
  const eatenOfLimit = t('food.dashboard.eatenOfLimit', {
    eaten: Math.round(eatenKcal),
    limit: Math.round(model.limitKcal),
  });

  const centerInfo: KcalRingCenterInfo = {
    value: remainingAbs,
    isOver: model.isOver,
    label: centerLabel,
    eatenKcal: Math.round(eatenKcal),
    limitKcal: Math.round(model.limitKcal),
  };

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={`${remainingAbs} ${centerLabel}. ${eatenOfLimit}`}
    >
      <Canvas style={{ width: size, height: size }}>
        <Group origin={{ x: cx, y: cy }} transform={[{ rotate: -Math.PI / 2 }]}>
          {/* Track */}
          <Path
            path={circle}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            color={c.heroTrack}
          />
          {/* Bonus track (ember tint), streams in from the base end */}
          <Path
            path={circle}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            strokeCap="butt"
            color={c.ember}
            opacity={bonusTrackOpacity}
            start={bonusStart}
            end={bonusTrackEndV}
          />

          {/* Glow layers */}
          <Path
            path={circle}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            strokeCap="round"
            color={glowColor}
            opacity={glowSoft}
            start={0}
            end={fillClamped}
          >
            <BlurMask blur={22} style="normal" />
          </Path>

          {/* Main fill (sweep gradient lime → foam) */}
          <Path
            path={circle}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            strokeCap="round"
            start={0}
            end={hasBonus ? baseEnd : fillClamped}
          >
            <SweepGradient
              c={vec(cx, cy)}
              start={0}
              end={sweepEnd}
              colors={mainColors}
            />
          </Path>

          {/* Bonus fill (ember) */}
          {hasBonus && (
            <Path
              path={circle}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              strokeCap="round"
              opacity={bonusFillOpacity}
              start={bonusStart}
              end={bonusFillEnd}
            >
              <SweepGradient
                c={vec(cx, cy)}
                start={model.baseShare * 360}
                end={360}
                colors={[c.ember, c.emberHead]}
              />
            </Path>
          )}

          {/* Separator dot at the base / bonus boundary */}
          {hasBonus && (
            <Circle cx={gapX.x} cy={gapX.y} r={2} color={c.forestBot} />
          )}

          {/* Head: glow + dot */}
          <Circle
            cx={headX}
            cy={headY}
            r={STROKE_WIDTH * 0.62}
            color={glowColor}
            opacity={glowHead}
          >
            <BlurMask blur={14} style="normal" />
          </Circle>
          <Circle
            cx={headX}
            cy={headY}
            r={STROKE_WIDTH * 0.3}
            color={headColor}
            opacity={headOpacity}
          />
        </Group>
      </Canvas>
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center px-12"
      >
        {renderCenter ? (
          renderCenter(centerInfo)
        ) : (
          <Text
            style={[textStyles.numericHero, { color: c.heroLabel }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={maxFontSizeMultiplier.numeric}
          >
            {remainingAbs}
          </Text>
        )}
        <Text
          className="text-[15px] font-medium"
          style={{ color: model.isOver ? c.emberHead : c.heroLabel2 }}
        >
          {centerLabel}
        </Text>
        <Text
          className="mt-1 text-[13px]"
          style={{
            color: c.heroLabel2,
            opacity: 0.8,
            fontVariant: ['tabular-nums'],
          }}
        >
          {eatenOfLimit}
        </Text>
      </View>
    </View>
  );
}
