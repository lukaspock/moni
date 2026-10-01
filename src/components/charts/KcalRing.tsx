import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import {
  Easing,
  useReducedMotion,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { computeKcalRingModel } from '@/domain';
import { useThemeHex } from '@/theme/colors';

const STROKE_WIDTH = 20;

export interface KcalRingProps {
  /** kcal actually logged. */
  eatenKcal: number;
  /** base daily target, before any workout bonus. */
  baseKcal: number;
  /** additional allowance from a workout (PLAN §6.4), 0 if none. */
  bonusKcal: number;
  /** true = bonus is a provisional estimate (not yet earned) -> drawn fainter. */
  bonusIsProvisional: boolean;
  size?: number;
}

/**
 * Today kcal ring: one thick progress ring (eaten / total limit) with round caps and an
 * animated fill. The workout bonus is the last segment of the limit (bonus color). Center:
 * remaining kcal big, "eaten / limit" small; over the limit the ring and number turn red.
 * All numbers come from `computeKcalRingModel` (src/domain).
 */
export function KcalRing({
  eatenKcal,
  baseKcal,
  bonusKcal,
  bonusIsProvisional,
  size = 240,
}: KcalRingProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const model = computeKcalRingModel({ eatenKcal, baseKcal, bonusKcal });
  const hasBonus = model.bonusShare > 0;

  // Skia paints need concrete hex values (no PlatformColor).
  const accent = useThemeHex('accent');
  const bonusColor = useThemeHex('bonus');
  const danger = useThemeHex('danger');
  const trackColor = 'rgba(120,120,128,0.2)';

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = reduceMotion
      ? model.fillShare
      : withTiming(model.fillShare, {
          duration: 700,
          easing: Easing.out(Easing.cubic),
        });
  }, [fill, model.fillShare, reduceMotion]);

  const circle = useMemo(() => {
    const path = Skia.Path.Make();
    const r = (size - STROKE_WIDTH) / 2;
    path.addCircle(size / 2, size / 2, r);
    return path;
  }, [size]);

  // The bonus fill runs 0..fill (tail color); the accent fill is drawn over it and capped
  // at the base share, so the bonus color only shows past the base allowance.
  const baseEnd = useDerivedValue(() => Math.min(fill.value, model.baseShare));

  const overridden = model.isOver;
  const mainColor = overridden ? danger : accent;
  const tailColor = overridden ? danger : bonusColor;

  const remainingAbs = Math.abs(model.remainingKcal);
  const centerLabel = model.isOver
    ? t('food.dashboard.kcalOver')
    : t('food.dashboard.kcalLeft');

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={`${remainingAbs} ${centerLabel}. ${t('food.dashboard.eatenOfLimit', { eaten: Math.round(eatenKcal), limit: Math.round(model.limitKcal) })}`}
    >
      <Canvas style={{ width: size, height: size }}>
        <Group
          origin={{ x: size / 2, y: size / 2 }}
          transform={[{ rotate: -Math.PI / 2 }]}
        >
          <Path
            path={circle}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            color={trackColor}
          />
          {hasBonus && (
            <Path
              path={circle}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              strokeCap="butt"
              color={bonusColor}
              opacity={bonusIsProvisional ? 0.25 : 0.4}
              start={model.baseShare}
              end={1}
            />
          )}
          {hasBonus && (
            <Path
              path={circle}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              strokeCap="round"
              color={tailColor}
              start={0}
              end={fill}
            />
          )}
          <Path
            path={circle}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            strokeCap="round"
            color={mainColor}
            start={0}
            end={hasBonus ? baseEnd : fill}
          />
        </Group>
      </Canvas>
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center px-10"
      >
        <Text
          className={`text-5xl font-bold ${overridden ? 'text-destructive' : 'text-label'}`}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {remainingAbs}
        </Text>
        <Text
          className={`text-base font-medium ${overridden ? 'text-destructive' : 'text-secondary-label'}`}
        >
          {centerLabel}
        </Text>
        <Text className="text-secondary-label mt-1 text-sm">
          {t('food.dashboard.eatenOfLimit', {
            eaten: Math.round(eatenKcal),
            limit: Math.round(model.limitKcal),
          })}
        </Text>
      </View>
    </View>
  );
}
