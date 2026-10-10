import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { TFunction } from 'i18next';

import { PressableScale, withAlpha } from '@/components/motion';
import { Card, Chip } from '@/components/ui';
import {
  WATER_DEFAULT_GLASS_ML,
  WATER_PRESETS_ML,
  waterDisplay,
  type UnitSystem,
} from '@/domain';
import { haptic } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/motionPrefs';
import { useThemeHex } from '@/theme/colors';
import { REDUCE, duration, easing } from '@/theme/motion';
import { textStyles } from '@/theme/typography';

import { useAddWater, useUndoWater, useWaterForDate } from '../index';

const CAPSULE_W = 56;
const CAPSULE_H = 92;
const WAVE_H = 8;

/** Localized "250 ml" / "1.5 l" / "8 fl oz". */
export function formatWaterAmount(
  t: TFunction,
  ml: number,
  unitSystem: UnitSystem,
  language: string,
): string {
  const { value, unit } = waterDisplay(ml, unitSystem);
  const formatted = value.toLocaleString(language, {
    maximumFractionDigits: 2,
  });
  if (unit === 'l') return t('identity.water.unit.l', { value: formatted });
  if (unit === 'flOz')
    return t('identity.water.unit.flOz', { value: formatted });
  return t('identity.water.unit.ml', { value: formatted });
}

/** Wave path two wavelengths wide; translating it by one wavelength loops seamlessly. */
function wavePath(w: number): string {
  const mid = WAVE_H / 2;
  const q = w / 4;
  return (
    `M0 ${mid} Q${q} 0 ${q * 2} ${mid} T${q * 4} ${mid} T${q * 6} ${mid} T${q * 8} ${mid}` +
    ` L${w * 2} ${WAVE_H} L0 ${WAVE_H} Z`
  );
}

/** Capsule "tide gauge": the fill rises with the day's water, crest drifts gently. */
const WaterCapsule = memo(function WaterCapsule({
  fraction,
}: {
  fraction: number;
}) {
  const reduced = useReduceMotion();
  const water = useThemeHex('accent');
  const track = useThemeHex('surfaceRaised');
  const level = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    level.value = withTiming(fraction, {
      duration: duration.slow,
      easing: easing.rise,
      reduceMotion: REDUCE,
    });
  }, [fraction, level]);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(drift);
      drift.value = 0;
      return;
    }
    drift.value = 0;
    drift.value = withRepeat(
      withTiming(1, {
        duration: duration.ambient,
        easing: Easing.linear,
        reduceMotion: REDUCE,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(drift);
  }, [reduced, drift]);

  const fillStyle = useAnimatedStyle(() => ({
    // an empty capsule still shows a thin waterline
    height: Math.max(WAVE_H / 2, level.value * CAPSULE_H),
  }));
  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -drift.value * CAPSULE_W }],
  }));

  return (
    <View
      style={{
        width: CAPSULE_W,
        height: CAPSULE_H,
        borderRadius: CAPSULE_W / 2,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: track,
      }}
    >
      <Animated.View
        style={[
          { position: 'absolute', left: 0, right: 0, bottom: 0 },
          fillStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -WAVE_H + 1,
              left: 0,
              width: CAPSULE_W * 2,
              height: WAVE_H,
            },
            waveStyle,
          ]}
        >
          <Svg width={CAPSULE_W * 2} height={WAVE_H}>
            <Path d={wavePath(CAPSULE_W)} fill={withAlpha(water, 0.85)} />
          </Svg>
        </Animated.View>
        <View style={{ flex: 1, backgroundColor: withAlpha(water, 0.85) }} />
      </Animated.View>
    </View>
  );
});

const PRESET_LABEL_KEYS = {
  250: 'identity.water.preset.glass',
  330: 'identity.water.preset.smallBottle',
  500: 'identity.water.preset.bottle',
} as const;

export interface WaterAddedInfo {
  message: string;
  undo: () => void;
}

/**
 * Today's water card: tap = +1 default glass, long-press = presets.
 * The host shows the undo toast (`onAdded`).
 */
export function WaterCard({
  date,
  isTrainingDay,
  onAdded,
}: {
  date: string;
  isTrainingDay: boolean;
  onAdded: (info: WaterAddedInfo) => void;
}) {
  const { t, i18n } = useTranslation();
  const { progress, unitSystem } = useWaterForDate(date, { isTrainingDay });
  const { addWater } = useAddWater();
  const { undoWater } = useUndoWater();
  const [presetsOpen, setPresetsOpen] = useState(false);
  const fmt = (ml: number) =>
    formatWaterAmount(t, ml, unitSystem, i18n.language);

  const add = (ml: number) => {
    const id = addWater(ml, date);
    setPresetsOpen(false);
    if (!id) return;
    haptic.itemAdded();
    onAdded({
      message: t('identity.water.added', { amount: fmt(ml) }),
      undo: () => undoWater(id, date),
    });
  };
  const togglePresets = () => {
    haptic.select();
    setPresetsOpen((open) => !open);
  };

  const levelText = t('identity.water.amountOfGoal', {
    amount: fmt(progress.consumedMl),
    goal: fmt(progress.goalMl),
  });

  return (
    <Card className="gap-4">
      <PressableScale
        haptic={false}
        preset="subtle"
        onPress={() => add(WATER_DEFAULT_GLASS_ML)}
        onLongPress={togglePresets}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={t('identity.water.a11yLevel', {
          amount: fmt(progress.consumedMl),
          goal: fmt(progress.goalMl),
        })}
        accessibilityHint={t('identity.water.a11yHint', {
          amount: fmt(WATER_DEFAULT_GLASS_ML),
        })}
        accessibilityActions={[{ name: 'longpress' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'longpress') togglePresets();
        }}
        className="flex-row items-center gap-4"
      >
        <WaterCapsule fraction={progress.fraction} />
        <View className="flex-1 gap-1">
          <Text
            className="text-label-secondary"
            style={textStyles.overline}
            maxFontSizeMultiplier={1.3}
          >
            {t('identity.water.title')}
          </Text>
          <Text
            className="text-label"
            style={textStyles.numericM}
            maxFontSizeMultiplier={1.15}
          >
            {levelText}
          </Text>
          <Text
            className={progress.reached ? 'text-tint' : 'text-label-secondary'}
            style={textStyles.callout}
            maxFontSizeMultiplier={1.4}
          >
            {progress.reached
              ? t('identity.water.reached')
              : t('identity.water.remaining', {
                  amount: fmt(progress.remainingMl),
                })}
          </Text>
          <Text
            className="text-label-tertiary"
            style={textStyles.caption}
            maxFontSizeMultiplier={1.4}
          >
            {t('identity.water.hint')}
          </Text>
        </View>
      </PressableScale>

      {presetsOpen ? (
        <Animated.View
          entering={FadeIn.duration(duration.fast).reduceMotion(REDUCE)}
          exiting={FadeOut.duration(duration.instant).reduceMotion(REDUCE)}
          className="gap-2"
        >
          <Text
            className="text-label-secondary"
            style={textStyles.caption}
            maxFontSizeMultiplier={1.4}
          >
            {t('identity.water.presetsTitle')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {WATER_PRESETS_ML.map((ml) => {
              const key =
                PRESET_LABEL_KEYS[ml as keyof typeof PRESET_LABEL_KEYS];
              const label = key ? `${t(key)} · ${fmt(ml)}` : fmt(ml);
              return (
                <Chip
                  key={ml}
                  label={label}
                  symbol="drop.fill"
                  onPress={() => add(ml)}
                  accessibilityHint={t('identity.water.add', {
                    amount: fmt(ml),
                  })}
                />
              );
            })}
          </View>
        </Animated.View>
      ) : null}
    </Card>
  );
}
