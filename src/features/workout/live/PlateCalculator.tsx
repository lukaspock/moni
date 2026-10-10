/**
 * Inline plate calculator for barbell exercises (opens under the weight
 * stepper of a set). Shows one side of the bar with proportional, colored
 * plates, the plates as text, and a remainder when the weight can't be loaded
 * exactly. Bar weight = device setting (`plateSettings.ts`).
 */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SymbolView } from 'expo-symbols';

import { Chip } from '@/components/ui';
import { storedToDisplay } from '@/domain';
import {
  BAR_PRESETS,
  calculatePlates,
  plateHeightRatio,
  plateTone,
  type PlateTone,
  type PlateUnit,
} from '@/domain/plates';
import { haptic } from '@/lib/haptics';
import { themeColor, type ThemeColorName } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { usePlateSettings } from './plateSettings';
import { formatNumber, unitLabel } from './shared';

const TONE_COLOR: Record<PlateTone, ThemeColorName> = {
  red: 'danger',
  blue: 'fat',
  yellow: 'carbs',
  green: 'success',
  white: 'surfaceHigh',
  black: 'label',
  silver: 'labelTertiary',
};

const MAX_PLATE_HEIGHT = 84;
const CUSTOM_STEP: Record<PlateUnit, number> = { kg: 0.5, lb: 1 };

export function PlateCalculator({
  stored,
  unit,
  onClose,
}: {
  /** The set's weight, stored metric (kg). */
  stored: number | null;
  unit: PlateUnit;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const bar = usePlateSettings((s) => s.bar[unit]);
  const setBar = usePlateSettings((s) => s.setBar);
  const presets = BAR_PRESETS[unit];
  const [customOpen, setCustomOpen] = useState(() => !presets.includes(bar));
  const unitText = unitLabel(t, unit);

  const target = stored === null ? null : storedToDisplay(stored, unit);
  const result = target === null ? null : calculatePlates(target, bar, unit);
  const platesText = result?.perSide.map(formatNumber).join(' · ') ?? '';

  let status: string;
  if (result === null) status = t('workoutLive.plates.emptyWeight');
  else if (result.belowBar)
    status = t('workoutLive.plates.belowBar', {
      value: formatNumber(bar),
      unit: unitText,
    });
  else if (result.perSide.length === 0)
    status = t('workoutLive.plates.onlyBar');
  else status = platesText;

  const remainderText =
    result && !result.belowBar && result.remainder > 0.001
      ? t('workoutLive.plates.remainder', {
          value: formatNumber(result.remainder),
          unit: unitText,
        })
      : null;

  return (
    <View
      className="bg-surface-raised mt-1 gap-3 rounded-2xl p-3"
      style={{ borderCurve: 'continuous' }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
          className="text-label-secondary"
          style={textStyles.overline}
        >
          {t('workoutLive.plates.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('workoutLive.plates.close')}
          hitSlop={8}
          onPress={onClose}
          className="h-8 w-8 items-center justify-center rounded-full"
        >
          <SymbolView
            name="xmark"
            size={14}
            tintColor={themeColor('labelSecondary')}
          />
        </Pressable>
      </View>

      {/* One side of the bar: sleeve stub, collar, plates from inside out. */}
      <View
        accessible
        accessibilityLabel={t('workoutLive.plates.a11y', {
          plates: result?.perSide.length ? platesText : status,
        })}
        className="flex-row items-center"
        style={{ height: MAX_PLATE_HEIGHT + 18 }}
      >
        <View
          className="bg-label-tertiary h-2 w-8 rounded-l-full"
          importantForAccessibility="no"
        />
        <View
          className="bg-label-secondary h-5 w-2 rounded-sm"
          importantForAccessibility="no"
        />
        <View className="flex-row items-center gap-0.5">
          {(result?.perSide ?? []).map((plate, i) => {
            const tone = plateTone(plate, unit);
            return (
              <View key={`${plate}-${i}`} className="items-center">
                <View
                  style={{
                    height: Math.round(
                      MAX_PLATE_HEIGHT * plateHeightRatio(plate, unit),
                    ),
                    width: plate >= (unit === 'kg' ? 10 : 25) ? 14 : 9,
                    borderRadius: 3,
                    borderCurve: 'continuous',
                    backgroundColor: themeColor(TONE_COLOR[tone]),
                    borderWidth: tone === 'white' ? 1 : 0,
                    borderColor: themeColor('separator'),
                  }}
                />
              </View>
            );
          })}
        </View>
        <View
          className="bg-label-tertiary h-2 flex-1 rounded-r-full"
          importantForAccessibility="no"
        />
      </View>

      <View className="gap-0.5">
        <Text
          maxFontSizeMultiplier={1.15}
          className="text-label"
          style={textStyles.numericS}
        >
          {status}
          {result && result.perSide.length > 0 ? ` ${unitText}` : ''}
        </Text>
        {remainderText ? (
          <Text
            maxFontSizeMultiplier={1.3}
            className="text-label-secondary"
            style={textStyles.caption}
          >
            {`${remainderText} · ${t('workoutLive.plates.loaded', {
              value: formatNumber(result!.achieved),
              unit: unitText,
            })}`}
          </Text>
        ) : null}
      </View>

      <View className="gap-2">
        <Text
          maxFontSizeMultiplier={1.3}
          className="text-label-secondary"
          style={textStyles.caption}
        >
          {t('workoutLive.plates.bar')}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          {presets.map((p) => (
            <Chip
              key={p}
              label={`${formatNumber(p)} ${unitText}`}
              selected={!customOpen && bar === p}
              activeStyle="soft"
              onPress={() => {
                haptic.select();
                setCustomOpen(false);
                setBar(unit, p);
              }}
            />
          ))}
          <Chip
            label={
              customOpen
                ? `${formatNumber(bar)} ${unitText}`
                : t('workoutLive.plates.custom')
            }
            selected={customOpen}
            activeStyle="soft"
            onPress={() => {
              haptic.select();
              setCustomOpen(true);
            }}
          />
          {customOpen ? (
            <View
              className="flex-row items-center gap-1"
              accessibilityLabel={t('workoutLive.plates.customA11y', {
                value: formatNumber(bar),
                unit: unitText,
              })}
            >
              <BarStep
                symbol="minus"
                label={t('workoutLive.plates.barLighter')}
                onPress={() => setBar(unit, bar - CUSTOM_STEP[unit])}
              />
              <BarStep
                symbol="plus"
                label={t('workoutLive.plates.barHeavier')}
                onPress={() => setBar(unit, bar + CUSTOM_STEP[unit])}
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function BarStep({
  symbol,
  label,
  onPress,
}: {
  symbol: 'minus' | 'plus';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      className="bg-tint-soft h-9 w-9 items-center justify-center rounded-full"
    >
      <SymbolView
        name={symbol}
        size={14}
        weight="bold"
        tintColor={themeColor('accent')}
      />
    </Pressable>
  );
}
