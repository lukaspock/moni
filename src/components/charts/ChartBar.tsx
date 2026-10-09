import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { duration, easing, REDUCE } from '@/theme/motion';

export interface ChartBarProps {
  /** total height of the bar slot in px */
  areaPx: number;
  /** fill height in px (0 = empty slot) */
  heightPx: number;
  trackColor: string;
  fillColor: string;
  /** upper part of the fill (above `capFromPx`) in this color — bonus cap */
  capColor?: string;
  capFromPx?: number;
  /** 3-pt top edge (over-target days) */
  edgeColor?: string;
  /** 2-pt outline ring (today) */
  ringColor?: string;
  /** stagger delay in ms */
  delay?: number;
  maxWidth?: number;
}

const RADIUS = 8;

/** Rounded (continuous corners) animated bar used by WeeklyBars/DailyKcalBars. */
export function ChartBar({
  areaPx,
  heightPx,
  trackColor,
  fillColor,
  capColor,
  capFromPx,
  edgeColor,
  ringColor,
  delay = 0,
  maxWidth = 28,
}: ChartBarProps) {
  const reduceMotion = useReducedMotion();
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = reduceMotion
      ? heightPx
      : withDelay(
          delay,
          withTiming(heightPx, {
            duration: duration.slow,
            easing: easing.rise,
            reduceMotion: REDUCE,
          }),
        );
  }, [h, heightPx, delay, reduceMotion]);
  const style = useAnimatedStyle(() => ({ height: h.value }));

  return (
    <View
      style={{
        height: areaPx,
        width: '100%',
        maxWidth,
        justifyContent: 'flex-end',
        borderRadius: RADIUS,
        borderCurve: 'continuous',
        backgroundColor: trackColor,
        overflow: 'hidden',
        borderWidth: ringColor ? 2 : 0,
        borderColor: ringColor,
      }}
    >
      <Animated.View
        style={[
          {
            width: '100%',
            backgroundColor: fillColor,
            borderRadius: RADIUS,
            borderCurve: 'continuous',
            overflow: 'hidden',
          },
          style,
        ]}
      >
        {capColor != null && capFromPx != null && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: capFromPx,
              height: areaPx,
              backgroundColor: capColor,
            }}
          />
        )}
        {edgeColor != null && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: 3,
              backgroundColor: edgeColor,
            }}
          />
        )}
      </Animated.View>
    </View>
  );
}
