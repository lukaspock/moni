import { Canvas, Group, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/motionPrefs';
import { themeColor, useThemeHex } from '@/theme/colors';
import { REDUCE, duration, easing, exit } from '@/theme/motion';
import { textStyles } from '@/theme/typography';

import { withAlpha } from './colorAlpha';
import {
  TIDE_PERIOD_MS,
  TIDE_TURNS,
  surfaceBaseY,
  tideLevel,
  waveY,
} from './tideMath';

export interface TideLoaderProps {
  /** Diameter in pt, default 96 (inline), 160 for full-screen analysis. */
  size?: number;
  /**
   * Current phase text shown below (already translated, e.g. "Zutaten
   * erkennen ..."). Changing it cross-fades. Also the accessibility label.
   */
  phase?: string;
  /** 'loading' (default) | 'done' fills up and fades | 'error' dims and stops. */
  state?: 'loading' | 'done' | 'error';
  /** Fired after the 'done' animation. */
  onDoneAnimationEnd?: () => void;
  style?: StyleProp<ViewStyle>;
}

const WAVE_POINTS = 28;

/**
 * Skia loading animation instead of a spinner: a vessel whose water level
 * slowly rises and falls (tide) with a moving surface wave, circled by a thin
 * orbit arc. One UI-thread driver, no JS frames. Reduce Motion: static
 * half-filled vessel, no wave/orbit (the phase text still changes).
 */
export function TideLoader({
  size = 96,
  phase,
  state = 'loading',
  onDoneAnimationEnd,
  style,
}: TideLoaderProps) {
  const reduce = useReduceMotion();
  const accent = useThemeHex('accent');
  const outline = useThemeHex('separator');

  const c = size / 2;
  const R = size * 0.34;
  const orbitR = size * 0.45;
  const amp = size * 0.022;

  const vessel = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(c, c, R);
    return p;
  }, [c, R]);
  const orbit = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(c, c, orbitR);
    return p;
  }, [c, orbitR]);

  const t = useSharedValue(0);
  const fill = useSharedValue(0); // 0 = tide, 1 = full (done)
  const orbitOpacity = useSharedValue(1);
  const dim = useSharedValue(1);
  const vanish = useSharedValue(0);

  useEffect(() => {
    if (reduce) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration: TIDE_PERIOD_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, [reduce, t]);

  useEffect(() => {
    const timing = { reduceMotion: REDUCE };
    if (state === 'loading') {
      fill.value = withTiming(0, { duration: duration.base, ...timing });
      orbitOpacity.value = withTiming(1, {
        duration: duration.fast,
        ...timing,
      });
      dim.value = withTiming(1, { duration: duration.base, ...timing });
      vanish.value = 0;
      return;
    }
    orbitOpacity.value = withTiming(0, { duration: duration.fast, ...timing });
    if (state === 'error') {
      dim.value = withTiming(0.35, { duration: duration.base, ...timing });
      return;
    }
    fill.value = withTiming(1, {
      duration: duration.slow,
      easing: easing.rise,
      ...timing,
    });
    vanish.value = withTiming(1, {
      duration: exit(duration.base),
      easing: easing.ebb,
      ...timing,
    });
    const id = setTimeout(
      () => onDoneAnimationEnd?.(),
      reduce ? 0 : duration.slow + exit(duration.base),
    );
    return () => clearTimeout(id);
  }, [state, reduce, fill, orbitOpacity, dim, vanish, onDoneAnimationEnd]);

  const water = useDerivedValue(() => {
    const level = tideLevel(t.value) * (1 - fill.value) + 0.96 * fill.value;
    const base = surfaceBaseY(c, R, level);
    const left = c - R;
    const width = 2 * R;
    const p = Skia.Path.Make();
    p.moveTo(left, waveY(left, left, width, base, amp, t.value));
    for (let i = 1; i <= WAVE_POINTS; i++) {
      const x = left + (width * i) / WAVE_POINTS;
      p.lineTo(x, waveY(x, left, width, base, amp, t.value));
    }
    p.lineTo(left + width, c + R + 2);
    p.lineTo(left, c + R + 2);
    p.close();
    return p;
  });

  const orbitTransform = useDerivedValue(() => [
    { rotate: t.value * TIDE_TURNS * 2 * Math.PI },
  ]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: dim.value * (1 - vanish.value),
    transform: [{ scale: 1 + 0.12 * vanish.value }],
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={phase}
      style={[{ alignItems: 'center', gap: 12 }, style]}
    >
      <Animated.View style={containerStyle}>
        <Canvas
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ width: size, height: size }}
        >
          <Group clip={vessel}>
            <Path path={water} color={accent} opacity={0.9} />
          </Group>
          <Path
            path={vessel}
            style="stroke"
            strokeWidth={Math.max(1.5, size * 0.02)}
            color={withAlpha(outline, 1)}
          />
          <Group
            origin={vec(c, c)}
            transform={orbitTransform}
            opacity={orbitOpacity}
          >
            <Path
              path={orbit}
              style="stroke"
              strokeWidth={Math.max(2, size * 0.03)}
              strokeCap="round"
              start={0}
              end={0.22}
              color={accent}
            />
          </Group>
        </Canvas>
      </Animated.View>
      {phase ? (
        <Animated.Text
          key={phase}
          entering={FadeIn.duration(duration.fast).reduceMotion(REDUCE)}
          exiting={FadeOut.duration(exit(duration.fast)).reduceMotion(REDUCE)}
          accessibilityElementsHidden
          style={[textStyles.callout, { color: themeColor('labelSecondary') }]}
        >
          {phase}
        </Animated.Text>
      ) : null}
    </View>
  );
}
