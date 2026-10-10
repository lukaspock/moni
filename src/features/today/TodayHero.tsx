import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { KcalRing } from '@/components/charts/KcalRing';
import { RollingNumber, withAlpha } from '@/components/motion';
import { Card } from '@/components/ui';
import type { FoodTotals } from '@/features/food';
import type { DailyTargets } from '@/features/targets';
import { haptic } from '@/lib/haptics';
import { fixedColors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

import { ringStatus, type RingStatusKind } from './model';

export interface TodayHeroProps {
  targets: DailyTargets;
  totals: FoodTotals;
  /** where the MealFlight should land (reports the ring centre in window coordinates) */
  ringRef?: React.RefObject<View | null>;
}

/** Hero card: kcal ring + three macro lines. Over the limit stays calm (no red, no haptic). */
export function TodayHero({ targets, totals, ringRef }: TodayHeroProps) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const [explain, setExplain] = useState(false);
  const size = Math.max(180, Math.min(224, width - 40 - 48 - 60));
  const bonus = Math.round(targets.workoutBonusKcal);
  const base = Math.round(targets.baseKcal);
  const fmt = (n: number) => n.toLocaleString(i18n.language);
  const status = ringStatus({
    eatenKcal: totals.kcal,
    baseKcal: targets.baseKcal,
    bonusKcal: targets.workoutBonusKcal,
  });

  const statusText: Record<RingStatusKind, string> = {
    roomLeft: t('identity.ring.roomLeft', { kcal: fmt(status?.kcal ?? 0) }),
    nearLevel: t('identity.ring.nearLevel', { kcal: fmt(status?.kcal ?? 0) }),
    onLevel: t('identity.ring.onLevel'),
    above: t('identity.ring.above', { kcal: fmt(status?.kcal ?? 0) }),
    springTide: t('identity.ring.springTide', { kcal: fmt(status?.kcal ?? 0) }),
  };
  const a11y = `${t('identity.ring.a11y', {
    eaten: fmt(Math.round(totals.kcal)),
    level: fmt(Math.round(targets.totalKcal)),
  })}. ${status ? statusText[status.kind] : ''}`;
  const groupSeparator = i18n.language.startsWith('de') ? '.' : ',';

  return (
    <Card variant="hero" className="items-stretch gap-4 pb-5 pt-4">
      <Pressable
        onPress={() => {
          haptic.select();
          setExplain((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityHint={t('identity.today.ringHint')}
        className="items-center gap-3"
      >
        <View ref={ringRef} collapsable={false}>
          <KcalRing
            size={size}
            eatenKcal={totals.kcal}
            baseKcal={targets.baseKcal}
            bonusKcal={targets.workoutBonusKcal}
            renderCenter={(info) => (
              <RollingNumber
                value={info.value}
                startFrom={0}
                fontSize={48}
                fontFamily={fontFamily.displayBlack}
                color={
                  info.isOver ? fixedColors.emberHead : fixedColors.heroLabel
                }
                glowColor={fixedColors.limeHead}
                groupSeparator={groupSeparator}
              />
            )}
          />
        </View>
        {bonus > 0 ? (
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: withAlpha(fixedColors.ember, 0.18) }}
          >
            <Text
              style={{
                color: fixedColors.emberHead,
                fontSize: 13,
                fontWeight: '600',
              }}
              maxFontSizeMultiplier={1.3}
            >
              {t('identity.ring.bonusLine', { kcal: fmt(bonus) })}
            </Text>
          </View>
        ) : null}
        {status && status.kind !== 'roomLeft' ? (
          <Text
            style={{
              color: fixedColors.heroLabel2,
              fontSize: 15,
              textAlign: 'center',
            }}
            maxFontSizeMultiplier={1.3}
          >
            {statusText[status.kind]}
          </Text>
        ) : null}
        {explain ? (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
            className="gap-1"
          >
            <Text
              style={{
                color: fixedColors.heroLabel,
                fontSize: 15,
                fontWeight: '600',
                textAlign: 'center',
              }}
              maxFontSizeMultiplier={1.3}
            >
              {bonus > 0
                ? t('identity.ring.why', {
                    base: fmt(base),
                    bonus: fmt(bonus),
                    total: fmt(Math.round(targets.totalKcal)),
                  })
                : t('identity.ring.whyNoBonus', { base: fmt(base) })}
            </Text>
            <Text
              style={{
                color: fixedColors.heroLabel2,
                fontSize: 13,
                textAlign: 'center',
              }}
              maxFontSizeMultiplier={1.3}
            >
              {t('identity.ring.explainer')}
            </Text>
          </Animated.View>
        ) : null}
      </Pressable>

      <View
        style={{
          height: 1,
          backgroundColor: 'rgba(245,242,234,0.10)',
        }}
      />
      <View className="flex-row gap-4">
        <MacroMini
          letterLabel={t('food.dashboard.protein')}
          color={fixedColors.protein}
          eaten={totals.proteinG}
          target={targets.proteinG}
        />
        <MacroMini
          letterLabel={t('food.dashboard.carbs')}
          color={fixedColors.carbs}
          eaten={totals.carbsG}
          target={targets.carbsG}
        />
        <MacroMini
          letterLabel={t('food.dashboard.fat')}
          color={fixedColors.fat}
          eaten={totals.fatG}
          target={targets.fatG}
        />
      </View>
    </Card>
  );
}

/** Compact macro column: name, eaten / target g (display font), thin bar in the macro color. */
function MacroMini({
  letterLabel,
  color,
  eaten,
  target,
}: {
  letterLabel: string;
  color: string;
  eaten: number;
  target: number;
}) {
  const e = Math.round(eaten);
  const g = Math.round(target);
  const share = g > 0 ? Math.min(1, e / g) : 0;
  return (
    <View
      className="flex-1 gap-1.5"
      accessible
      accessibilityLabel={`${letterLabel}: ${e} / ${g} g`}
    >
      <Text
        style={{
          color: fixedColors.heroLabel2,
          fontSize: 12,
          fontWeight: '600',
        }}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
        {letterLabel}
      </Text>
      <Text
        style={{
          color: fixedColors.heroLabel,
          fontFamily: fontFamily.display,
          fontSize: 16,
          fontVariant: ['tabular-nums'],
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.15}
      >
        {e}
        <Text style={{ color: fixedColors.heroLabel2, fontSize: 13 }}>
          {' '}
          / {g} g
        </Text>
      </Text>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(245,242,234,0.12)',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${share * 100}%`,
            height: '100%',
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}
