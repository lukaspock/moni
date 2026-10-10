import { useEffect, useState } from 'react';
import { Text, View, useColorScheme } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/motion';
import { elevationStyle } from '@/components/ui';
import { REDUCE, spring } from '@/theme/motion';

const PAD = 4;

function slideTo(x: SharedValue<number>, to: number, animate: boolean): void {
  x.value = animate
    ? withSpring(to, { ...spring.settle, reduceMotion: REDUCE })
    : to;
}

/**
 * Two (or more) pills in a capsule with a sliding indicator (`spring.settle`).
 * 48 pt track, each segment ≥ 44 pt tap target.
 */
export function SegmentToggle<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  accessibilityLabel: string;
}) {
  const scheme = useColorScheme();
  const [width, setWidth] = useState(0);
  const segment = width > 0 ? (width - PAD * 2) / options.length : 0;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const x = useSharedValue(0);
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    if (segment <= 0) return;
    slideTo(x, index * segment, placed);
  }, [index, segment, placed, x]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        // first measurement places the indicator without animating
        requestAnimationFrame(() => setPlaced(true));
      }}
      className="bg-surface-raised h-12 flex-row rounded-full"
      style={{ padding: PAD }}
    >
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          className="bg-surface rounded-full"
          style={[
            {
              position: 'absolute',
              top: PAD,
              bottom: PAD,
              left: PAD,
              width: segment,
            },
            elevationStyle('raised', scheme),
            indicatorStyle,
          ]}
        />
      ) : null}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            haptic={selected ? false : 'select'}
            preset="subtle"
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) onChange(o.value);
            }}
            style={{
              flex: 1,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              className={`text-[15px] font-semibold ${
                selected ? 'text-label' : 'text-label-secondary'
              }`}
            >
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
