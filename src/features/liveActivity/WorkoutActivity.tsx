/**
 * Native layout of the workout Live Activity (lock screen banner + Dynamic
 * Island), rendered by expo-widgets in the widget extension.
 *
 * IMPORTANT – the `'widget'` directive: babel-preset-expo turns this function
 * into a source string that the extension evaluates in its own JS context, so
 * the body may ONLY use its parameters, JS built-ins and the globals that
 * expo-widgets provides (all `@expo/ui/swift-ui` components + modifiers). No
 * closures over module scope — that's why the brand colors are inlined below
 * (copied from `theme.config.js` `fixed`; `layoutColors.test.ts` fails on
 * drift). The imports only exist for TypeScript.
 *
 * Props are finished strings from `derive.ts::buildActivityProps` (no i18n or
 * formatting here); elapsed time and rest countdown tick natively via timer
 * `Text`/`ProgressView`, so the app only updates on real state changes.
 */
import {
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  multilineTextAlignment,
  padding,
  progressViewStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type { LiveActivityEnvironment, LiveActivityLayout } from 'expo-widgets';

import type { WorkoutActivityProps } from './types';

export function WorkoutActivityLayout(
  props: WorkoutActivityProps,
  environment: LiveActivityEnvironment,
): LiveActivityLayout {
  'widget';
  // theme.config.js -> fixed.* (keep in sync, see layoutColors.test.ts)
  const EMBER = '#FF8A3D';
  const FOREST = '#0F2A20';
  const LABEL = '#F5F2EA';
  const LABEL2 = '#A9C7B8';
  const SYMBOL = 'figure.strengthtraining.traditional';

  // The rest timer may have run out while the app was suspended: the app sets
  // staleDate = rest end, so `isStale` flips without the app running.
  const resting =
    props.restEndsAtMs !== null &&
    !environment.isStale &&
    props.restEndsAtMs > Date.now();
  const started = new Date(props.startedAtMs);
  const restRange = resting
    ? {
        lower: new Date(props.restStartMs ?? Date.now()),
        upper: new Date(props.restEndsAtMs as number),
      }
    : null;

  const elapsedTimer = (size: number, color: string) => (
    <Text
      date={started}
      dateStyle="timer"
      modifiers={[
        font({ size, weight: 'semibold', design: 'rounded' }),
        monospacedDigit(),
        foregroundStyle(color),
      ]}
    />
  );

  const restTimer = (size: number, width?: number) =>
    restRange ? (
      <Text
        timerInterval={restRange}
        countsDown
        modifiers={[
          font({ size, weight: 'bold', design: 'rounded' }),
          monospacedDigit(),
          foregroundStyle(EMBER),
          ...(width ? [frame({ width, alignment: 'trailing' as const })] : []),
          multilineTextAlignment('trailing'),
        ]}
      />
    ) : null;

  const restBar =
    restRange && props.restStartMs !== null ? (
      <ProgressView
        timerInterval={restRange}
        countsDown
        modifiers={[progressViewStyle('linear'), tint(EMBER)]}
      >
        {/* no label: the countdown text sits next to it */}
      </ProgressView>
    ) : null;

  const exerciseBlock = (titleSize: number) => (
    <VStack alignment="leading" spacing={2}>
      <Text
        modifiers={[
          font({ size: titleSize, weight: 'semibold' }),
          foregroundStyle(LABEL),
          lineLimit(1),
        ]}
      >
        {props.exercise}
      </Text>
      {props.setLine ? (
        <Text
          modifiers={[
            font({ size: 14, weight: 'medium' }),
            monospacedDigit(),
            foregroundStyle(LABEL2),
            lineLimit(1),
          ]}
        >
          {props.setLine}
        </Text>
      ) : null}
    </VStack>
  );

  const caption = (text: string, color: string) => (
    <Text
      modifiers={[
        font({ size: 12, weight: 'semibold' }),
        foregroundStyle(color),
        lineLimit(1),
      ]}
    >
      {text}
    </Text>
  );

  const banner = (
    <VStack
      alignment="leading"
      spacing={10}
      modifiers={[padding({ all: 16 }), activityBackgroundTint(FOREST)]}
    >
      <HStack spacing={6}>
        <Image systemName={SYMBOL} size={13} color={EMBER} />
        {caption(props.routine, LABEL2)}
        <Spacer />
        {elapsedTimer(15, LABEL)}
      </HStack>
      {resting ? (
        <HStack alignment="center" spacing={12}>
          {exerciseBlock(17)}
          <Spacer />
          <VStack alignment="trailing" spacing={0}>
            {caption(props.restLabel, EMBER)}
            {restTimer(34)}
          </VStack>
        </HStack>
      ) : (
        exerciseBlock(20)
      )}
      {resting ? restBar : null}
    </VStack>
  );

  return {
    banner,
    compactLeading: (
      <HStack spacing={4}>
        <Image systemName="circle.fill" size={8} color={EMBER} />
        <Text
          modifiers={[
            font({ size: 13, weight: 'semibold' }),
            foregroundStyle(LABEL),
            lineLimit(1),
          ]}
        >
          {props.exerciseShort}
        </Text>
      </HStack>
    ),
    compactTrailing: resting ? (
      restTimer(14, 44)
    ) : (
      <Text
        date={started}
        dateStyle="timer"
        modifiers={[
          font({ size: 14, weight: 'semibold', design: 'rounded' }),
          monospacedDigit(),
          foregroundStyle(LABEL),
          frame({ width: 52, alignment: 'trailing' }),
          multilineTextAlignment('trailing'),
        ]}
      />
    ),
    minimal: resting ? (
      restTimer(12, 36)
    ) : (
      <Image systemName={SYMBOL} size={14} color={EMBER} />
    ),
    expandedLeading: (
      <VStack
        alignment="leading"
        spacing={4}
        modifiers={[padding({ leading: 4 })]}
      >
        <Image systemName={SYMBOL} size={22} color={EMBER} />
        {caption(props.setShort, LABEL2)}
      </VStack>
    ),
    expandedTrailing: (
      <VStack
        alignment="trailing"
        spacing={2}
        modifiers={[padding({ trailing: 4 })]}
      >
        {caption(
          resting ? props.restLabel : props.elapsedLabel,
          resting ? EMBER : LABEL2,
        )}
        {resting ? restTimer(24) : elapsedTimer(24, LABEL)}
      </VStack>
    ),
    expandedCenter: exerciseBlock(16),
    expandedBottom: (
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[padding({ horizontal: 4 })]}
      >
        {resting ? restBar : null}
        <HStack spacing={6}>
          {caption(props.routine, LABEL2)}
          <Spacer />
          {resting ? caption(props.elapsedLabel, LABEL2) : null}
          {resting ? elapsedTimer(12, LABEL2) : null}
        </HStack>
      </VStack>
    ),
  };
}
