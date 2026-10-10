import type { ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { haptic, type HapticEvent } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/motionPrefs';
import { duration, press, spring, type PressName } from '@/theme/motion';

/** Kept outside the component: shared values are mutated imperatively. */
function animatePress(
  scale: SharedValue<number>,
  opacity: SharedValue<number>,
  toScale: number,
  toOpacity: number,
): void {
  scale.value = withSpring(toScale, spring.tap);
  opacity.value = withTiming(toOpacity, {
    duration: toOpacity === 1 ? duration.fast : duration.instant,
  });
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<
  PressableProps,
  'style' | 'children'
> {
  /** Scale/opacity while pressed, default `press.default`. */
  preset?: PressName;
  /** Haptic on tap, default 'tapLight'; false = none. */
  haptic?: HapticEvent | false;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Pressable with a spring scale + opacity dip (UI thread). With Reduce Motion
 * only the opacity changes. Native glass: wrap the GlassView, don't scale it.
 */
export function PressableScale({
  preset = 'default',
  haptic: hapticEvent = 'tapLight',
  style,
  children,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reduce = useReduceMotion();
  const target = press[preset];
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const pressedOpacity = reduce
    ? Math.min(target.opacity, 0.92)
    : target.opacity;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(e: GestureResponderEvent) => {
        animatePress(
          scale,
          opacity,
          !reduce ? target.scale : 1,
          pressedOpacity,
        );
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        animatePress(scale, opacity, 1, 1);
        onPressOut?.(e);
      }}
      onPress={(e: GestureResponderEvent) => {
        if (hapticEvent) haptic[hapticEvent]();
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
