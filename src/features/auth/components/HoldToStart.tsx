import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { LogoMark } from '@/components/brand';
import { Celebration } from '@/components/motion';
import { haptic } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/motionPrefs';
import { useThemeHex } from '@/theme/colors';

import { GlassButton } from './GlassButton';

const SIZE = 104;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const HOLD_MS = 1400;
const AFTER_DONE_MS = 900;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Handshake ritual (doc 05 §4.2): press and hold the circle until the ring
 * fills (light -> medium -> medium -> success haptic ramp, foam on arrival).
 * Releasing early rewinds the ring. Reduce Motion and VoiceOver get a plain
 * "Let's go" button instead (a hold is not reachable there).
 */
export function HoldToStart({
  title,
  hint,
  a11yHint,
  fallbackLabel,
  onComplete,
}: {
  title: string;
  hint: string;
  a11yHint: string;
  fallbackLabel: string;
  onComplete: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const [screenReader, setScreenReader] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const done = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const track = useThemeHex('separator');
  const accent = useThemeHex('accent');

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((v) => {
        if (active) setScreenReader(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReader,
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  function complete() {
    if (done.current) return;
    done.current = true;
    clearTimers();
    setCelebrate(1);
    timers.current.push(setTimeout(onComplete, AFTER_DONE_MS));
  }

  function onPressIn() {
    if (done.current) return;
    haptic.onboardStep();
    timers.current.push(
      setTimeout(() => haptic.tap(), HOLD_MS * 0.4),
      setTimeout(() => haptic.tapLight(), HOLD_MS * 0.7),
    );
    progress.value = withTiming(
      1,
      { duration: HOLD_MS, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(complete)();
      },
    );
  }

  function onPressOut() {
    if (done.current) return;
    clearTimers();
    cancelAnimation(progress);
    progress.value = withTiming(0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.12 * progress.value }],
  }));

  if (reduceMotion || screenReader) {
    return <GlassButton label={fallbackLabel} onPress={onComplete} />;
  }

  return (
    <View
      className="items-center gap-2"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={a11yHint}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        hitSlop={12}
        style={{ width: SIZE, height: SIZE }}
      >
        <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={track}
            strokeWidth={STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={accent}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={ringProps}
            fill="none"
            rotation={-90}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <Animated.View
          style={markStyle}
          className="absolute inset-0 items-center justify-center"
        >
          <LogoMark size={48} variant="adaptive" decorative />
        </Animated.View>
      </Pressable>
      <Text className="text-label font-display-bold text-lg">{title}</Text>
      <Text className="text-label-secondary text-sm">{hint}</Text>
      {width > 0 ? (
        <Celebration
          kind="goalReached"
          trigger={celebrate}
          haptic="onboardResult"
          origin={{ x: width / 2, y: SIZE / 2 }}
          size={{ width, height: SIZE + 60 }}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      ) : null}
    </View>
  );
}
