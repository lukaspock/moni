import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import type { TFunction } from 'i18next';

import { PressableScale } from '@/components/motion';
import { Chip } from '@/components/ui';
import {
  WATER_DEFAULT_GLASS_ML,
  WATER_PRESETS_ML,
  waterDisplay,
  type UnitSystem,
} from '@/domain';
import { useAddWater, useUndoWater, useWaterForDate } from '@/features/water';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';
import { REDUCE, duration, easing } from '@/theme/motion';
import { textStyles } from '@/theme/typography';

/** Localized "250 ml" / "1.5 l" / "8 fl oz". */
function formatWater(
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

const PRESET_LABEL_KEYS = {
  250: 'identity.water.preset.glass',
  330: 'identity.water.preset.smallBottle',
  500: 'identity.water.preset.bottle',
} as const;

/** Thin level line under the row; rises with the day's water. */
const LevelLine = memo(function LevelLine({ fraction }: { fraction: number }) {
  const level = useSharedValue(0);
  useEffect(() => {
    level.value = withTiming(Math.min(1, Math.max(0, fraction)), {
      duration: duration.slow,
      easing: easing.rise,
      reduceMotion: REDUCE,
    });
  }, [fraction, level]);
  const style = useAnimatedStyle(() => ({ width: `${level.value * 100}%` }));
  return (
    <View className="bg-surface-raised h-1 overflow-hidden rounded-full">
      <Animated.View className="bg-tint h-1 rounded-full" style={style} />
    </View>
  );
});

export interface WaterAddedInfo {
  message: string;
  undo: () => void;
}

/**
 * Compact water row: one line with the day's amount and a "+".
 * Tap = +1 default glass, long-press = sizes. The host shows the undo toast.
 */
export function WaterRow({
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
  const fmt = (ml: number) => formatWater(t, ml, unitSystem, i18n.language);

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

  return (
    <View className="gap-3">
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
        className="gap-2 px-1"
      >
        <View className="min-h-[44px] flex-row items-center gap-3">
          <SymbolView
            name="drop.fill"
            size={18}
            tintColor={themeColor('accent')}
          />
          <Text
            className="text-label flex-1"
            style={textStyles.callout}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {t('identity.water.title')}
            <Text className="text-label-secondary">
              {'  '}
              {progress.reached
                ? t('identity.water.reached')
                : t('identity.water.amountOfGoal', {
                    amount: fmt(progress.consumedMl),
                    goal: fmt(progress.goalMl),
                  })}
            </Text>
          </Text>
          <SymbolView
            name="plus.circle.fill"
            size={26}
            tintColor={themeColor('accent')}
          />
        </View>
        <LevelLine fraction={progress.fraction} />
      </PressableScale>

      {presetsOpen ? (
        <Animated.View
          entering={FadeIn.duration(duration.fast).reduceMotion(REDUCE)}
          exiting={FadeOut.duration(duration.instant).reduceMotion(REDUCE)}
          className="flex-row flex-wrap gap-2"
        >
          {WATER_PRESETS_ML.map((ml) => {
            const key = PRESET_LABEL_KEYS[ml as keyof typeof PRESET_LABEL_KEYS];
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
        </Animated.View>
      ) : null}
    </View>
  );
}
