import { useCallback, type ReactNode } from 'react';
import {
  Pressable,
  type AccessibilityRole,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { REDUCE, spring } from '@/theme/motion';

const SPRING = { ...spring.tap, reduceMotion: REDUCE };

/**
 * Spring-scale press feedback (local stand-in until src/components/motion
 * provides the shared one). Returns the animated style + press handlers.
 */
export function usePressScale(scaleTo = 0.97) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = useCallback(() => {
    scale.set(withSpring(scaleTo, SPRING));
  }, [scale, scaleTo]);
  const onPressOut = useCallback(() => {
    scale.set(withSpring(1, SPRING));
  }, [scale]);
  return { style, onPressIn, onPressOut };
}

export interface PressableScaleProps {
  children: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  /** Target scale while pressed (default 0.97). */
  scaleTo?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: { selected?: boolean; disabled?: boolean };
}

/** Pressable whose content springs down on press. Layout classes go on `className`. */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  scaleTo,
  className,
  style,
  hitSlop,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
}: PressableScaleProps) {
  const press = usePressScale(scaleTo);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...accessibilityState }}
    >
      <Animated.View className={className} style={[press.style, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
