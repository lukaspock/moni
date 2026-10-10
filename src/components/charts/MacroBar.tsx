import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useThemeHex, type ThemeColorName } from '@/theme/colors';
import { duration, easing, REDUCE } from '@/theme/motion';
import { fontFamily, maxFontSizeMultiplier } from '@/theme/typography';

import { macroBarModel, markerLetter } from './charts.logic';

export type MacroKind = 'protein' | 'carbs' | 'fat';

export interface MacroBarProps {
  label: string;
  gramsEaten: number;
  gramsTarget: number;
  /** Protein is visually highlighted per PLAN §7.6. */
  highlighted?: boolean;
  /**
   * Macro identity (preferred): protein violet / carbs honey / fat cyan.
   * Legacy `color` still works: purple → protein, orange → carbs, accent → fat.
   */
  macro?: MacroKind;
  color?: 'accent' | 'orange' | 'purple';
  /** Render on the dark hero card (uses the hero track instead of surface). */
  onHero?: boolean;
}

const LEGACY: Record<NonNullable<MacroBarProps['color']>, MacroKind> = {
  purple: 'protein',
  orange: 'carbs',
  accent: 'fat',
};

const SOFT: Record<MacroKind, ThemeColorName> = {
  protein: 'proteinSoft',
  carbs: 'carbsSoft',
  fat: 'fatSoft',
};

/**
 * One macro row: letter marker badge (P/K/F or P/C/F — taken from the localized
 * label, so color is never the only carrier), name, "Xg / Yg" and an animated
 * bar. Over target the bar keeps its macro color, the target stays visible as
 * a tick and a short danger stroke closes the bar.
 */
export function MacroBar({
  label,
  gramsEaten,
  gramsTarget,
  highlighted = false,
  macro,
  color = 'accent',
  onHero = false,
}: MacroBarProps) {
  const kind: MacroKind = macro ?? LEGACY[color];
  const reduceMotion = useReducedMotion();
  const model = macroBarModel(gramsEaten, gramsTarget);

  const macroHex = useThemeHex(kind);
  const softHex = useThemeHex(SOFT[kind]);
  const trackHex = useThemeHex('surfaceRaised');
  const dangerHex = useThemeHex('danger');
  const labelHex = useThemeHex('label');
  const secondaryHex = useThemeHex('labelSecondary');
  const track = onHero ? 'rgba(245,242,234,0.12)' : trackHex;

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = reduceMotion
      ? model.fill
      : withTiming(model.fill, {
          duration: duration.slow,
          easing: easing.rise,
          reduceMotion: REDUCE,
        });
  }, [fill, model.fill, reduceMotion]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  const barH = highlighted ? 14 : 10;
  const badge = highlighted ? 24 : 20;
  const eaten = Math.round(gramsEaten);
  const target = Math.round(gramsTarget);

  return (
    <View
      className="gap-2"
      accessible
      accessibilityLabel={`${label}: ${eaten} / ${target} g`}
    >
      <View className="flex-row items-center gap-2">
        <View
          style={{
            width: badge,
            height: badge,
            borderRadius: 6,
            borderCurve: 'continuous',
            backgroundColor: onHero ? 'rgba(245,242,234,0.12)' : softHex,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: macroHex,
              fontSize: highlighted ? 13 : 11,
              fontWeight: '700',
            }}
            allowFontScaling={false}
          >
            {markerLetter(label)}
          </Text>
        </View>
        <Text
          className="flex-1"
          style={{
            color: onHero ? '#F5F2EA' : labelHex,
            fontSize: highlighted ? 17 : 15,
            fontWeight: highlighted ? '600' : '500',
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={{
            color: onHero ? '#A9C7B8' : secondaryHex,
            fontFamily: fontFamily.display,
            fontSize: 15,
            fontVariant: ['tabular-nums'],
          }}
          maxFontSizeMultiplier={maxFontSizeMultiplier.numeric}
        >
          {eaten} / {target} g
        </Text>
      </View>
      <View
        style={{
          height: barH,
          borderRadius: barH / 2,
          borderCurve: 'continuous',
          backgroundColor: track,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: barH / 2,
              borderCurve: 'continuous',
              backgroundColor: macroHex,
            },
            fillStyle,
          ]}
        />
        {model.isOver && (
          <>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${model.targetPos * 100}%`,
                width: 2,
                backgroundColor: onHero ? '#0F2A20' : trackHex,
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: 4,
                backgroundColor: dangerHex,
              }}
            />
          </>
        )}
      </View>
    </View>
  );
}
