import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/motionPrefs';
import { themeColor, useThemeHex } from '@/theme/colors';
import { REDUCE, easing, spring } from '@/theme/motion';
import { textStyles } from '@/theme/typography';

import { withAlpha } from './colorAlpha';
import {
  flightOpacity,
  flightPosition,
  flightScale,
  type Point,
} from './flightMath';

export interface MealFlightSpec {
  id: number;
  kcal: number;
  /** Start (screen coordinates); missing = chip fades in just above `to`. */
  from?: Point;
  /** Target, e.g. ring centre (screen coordinates). */
  to: Point;
}

/** Imperative state holder: render `<MealFlight flight={flight} onDone={clear} />`. */
export function useMealFlight(): {
  flight: MealFlightSpec | null;
  launch: (args: { kcal: number; from?: Point; to: Point }) => void;
  clear: () => void;
} {
  const [flight, setFlight] = useState<MealFlightSpec | null>(null);
  const counter = useRef(0);
  const launch = useCallback(
    (args: { kcal: number; from?: Point; to: Point }) => {
      counter.current += 1;
      setFlight({ id: counter.current, ...args });
    },
    [],
  );
  const clear = useCallback(() => setFlight(null), []);
  return { flight, launch, clear };
}

export interface MealFlightProps {
  flight: MealFlightSpec | null;
  /** Called when the chip has been absorbed (also immediately with Reduce Motion). */
  onDone?: () => void;
  /** Text of the chip, default `+<kcal>`. */
  label?: (kcal: number) => string;
  /** ms before the chip appears (sheet dismiss), default 120. */
  delay?: number;
}

/**
 * "+520" chip that pops up and flies in an arc from `from` to `to`
 * (~850 ms), shrinking while it is absorbed. Mount it in a full-screen,
 * non-interactive overlay so coordinates are screen coordinates. Reduce
 * Motion: no flight at all (onDone fires immediately; the caller shows the
 * new row/value change instead).
 */
export function MealFlight({
  flight,
  onDone,
  label = (k) => `+${Math.round(k)}`,
  delay = 120,
}: MealFlightProps) {
  const reduce = useReduceMotion();
  const accent = useThemeHex('accent');
  const appear = useSharedValue(0);
  const p = useSharedValue(0);
  const out = useSharedValue(0);
  const from = useSharedValue<Point>({ x: 0, y: 0 });
  const to = useSharedValue<Point>({ x: 0, y: 0 });

  const id = flight?.id;
  useEffect(() => {
    if (!flight) return;
    if (reduce) {
      const t = setTimeout(() => onDone?.(), 0);
      return () => clearTimeout(t);
    }
    const start = flight.from ?? { x: flight.to.x, y: flight.to.y - 36 };
    from.value = start;
    to.value = flight.to;
    appear.value = 0;
    p.value = 0;
    out.value = 0;
    appear.value = withDelay(
      delay,
      withSpring(1, { ...spring.bouncy, reduceMotion: REDUCE }),
      REDUCE,
    );
    p.value = withDelay(
      delay + 180,
      withTiming(1, {
        duration: 440,
        easing: easing.rise,
        reduceMotion: REDUCE,
      }),
      REDUCE,
    );
    out.value = withDelay(
      delay + 620,
      withTiming(1, { duration: 90, reduceMotion: REDUCE }),
      REDUCE,
    );
    const t = setTimeout(() => onDone?.(), delay + 620 + 90);
    return () => clearTimeout(t);
    // restart only for a new flight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reduce]);

  const style = useAnimatedStyle(() => {
    const pos = flightPosition(p.value, from.value, to.value);
    const a = Math.min(appear.value, 1);
    return {
      opacity: a * flightOpacity(p.value) * (1 - out.value),
      transform: [
        { translateX: pos.x },
        { translateY: pos.y },
        { scale: (0.8 + 0.2 * a) * flightScale(p.value) },
      ],
    };
  });

  if (!flight || reduce) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <View
          style={{
            position: 'absolute',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            borderCurve: 'continuous',
            backgroundColor: withAlpha(accent, 0.16),
          }}
        >
          <Text
            style={[textStyles.numericS, { color: themeColor('label') }]}
            numberOfLines={1}
          >
            {label(flight.kcal)}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
