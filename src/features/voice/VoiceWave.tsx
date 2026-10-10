import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/motionPrefs';
import { useThemeHex } from '@/theme/colors';
import { REDUCE, duration, easing } from '@/theme/motion';

/** One driver cycle; every wave runs a whole number of cycles per period (seamless loop). */
const PERIOD_MS = 6400;
const POINTS = 56;
/** Level shown with Reduce Motion while listening (static, no reaction to volume). */
const STATIC_LEVEL = 0.3;

function useWavePath(
  t: SharedValue<number>,
  level: SharedValue<number>,
  width: number,
  height: number,
  cycles: number,
  speed: number,
  ampFactor: number,
  offset: number,
) {
  return useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (width <= 0) return p;
    const mid = height / 2;
    const amp = (1.5 + level.value * height * 0.4) * ampFactor;
    for (let i = 0; i <= POINTS; i++) {
      const u = i / POINTS;
      // Envelope: calm at the edges, swell in the middle (a tide line, not an equalizer).
      const env = Math.sin(Math.PI * u);
      const y =
        mid +
        amp *
          env *
          Math.sin(2 * Math.PI * (cycles * u + speed * t.value) + offset);
      if (i === 0) p.moveTo(0, y);
      else p.lineTo(u * width, y);
    }
    return p;
  });
}

/**
 * Calm level line for the voice sheet: three layered sine waves (tides) whose
 * height follows the microphone volume. UI thread only. Reduce Motion: a
 * static wave (no drift, no volume reaction).
 */
export function VoiceWave({
  volume,
  active,
  height = 72,
}: {
  volume: SharedValue<number>;
  active: boolean;
  height?: number;
}) {
  const reduce = useReduceMotion();
  const accent = useThemeHex('accent');
  const [width, setWidth] = useState(0);
  const t = useSharedValue(0);
  const level = useSharedValue(0);

  useEffect(() => {
    if (reduce || !active) {
      cancelAnimation(t);
      return;
    }
    t.set(0);
    t.set(
      withRepeat(
        withTiming(1, { duration: PERIOD_MS, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(t);
  }, [reduce, active, t]);

  useEffect(() => {
    if (reduce) level.set(active ? STATIC_LEVEL : 0);
    else if (!active)
      level.set(
        withTiming(0, {
          duration: duration.base,
          easing: easing.ebb,
          reduceMotion: REDUCE,
        }),
      );
  }, [reduce, active, level]);

  useAnimatedReaction(
    () => volume.value,
    (v) => {
      if (reduce || !active) return;
      level.set(
        withTiming(v, {
          duration: duration.fast,
          easing: easing.settle,
        }),
      );
    },
    [reduce, active],
  );

  const back = useWavePath(t, level, width, height, 1.5, 2, 0.55, 1.2);
  const middle = useWavePath(t, level, width, height, 2, -3, 0.8, 2.4);
  const front = useWavePath(t, level, width, height, 2.5, 4, 1, 0);

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ height, width: '100%' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Canvas pointerEvents="none" style={{ flex: 1 }}>
        <Path
          path={back}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          color={accent}
          opacity={0.25}
        />
        <Path
          path={middle}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          color={accent}
          opacity={0.45}
        />
        <Path
          path={front}
          style="stroke"
          strokeWidth={2.5}
          strokeCap="round"
          color={accent}
          opacity={active ? 1 : 0.6}
        />
      </Canvas>
    </View>
  );
}
