/**
 * Compact ember head of the live session: name, running clock and an always
 * visible "Done"; while resting, a slim non-blocking rest bar underneath
 * (−15 / +15 / skip). Docs/identity/06 §5.
 */
import { useEffect } from 'react';
import { AppState, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';

import { PressableScale, withAlpha } from '@/components/motion';
import { formatClock } from '@/domain';
import { DEFAULT_REST_SECONDS } from '@/domain/workoutPrefill';
import { haptic } from '@/lib/haptics';
import { fixedColors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { elapsedSeconds, useActiveWorkoutStore } from '../session';
import { useNow } from './shared';

const REST_ADJUST_SECONDS = 15;
const INK_SOFT = withAlpha(fixedColors.ink, 0.14);

export function LiveHeader({
  title,
  onFinish,
}: {
  title: string;
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[fixedColors.ember, fixedColors.emberHot]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: insets.top + 6,
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderCurve: 'continuous',
        gap: 10,
      }}
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={{ ...textStyles.headline, color: fixedColors.ink }}
          >
            {title}
          </Text>
          <ElapsedClock />
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('workoutLive.header.finishA11y')}
          // The finish haptic belongs to the summary celebration.
          haptic={false}
          hitSlop={6}
          onPress={onFinish}
          style={{
            height: 44,
            paddingHorizontal: 20,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: fixedColors.ink,
          }}
        >
          <Text
            maxFontSizeMultiplier={1.3}
            style={{ ...textStyles.headline, color: fixedColors.paper }}
          >
            {t('workoutLive.header.finish')}
          </Text>
        </PressableScale>
      </View>
      <RestBar />
    </LinearGradient>
  );
}

/** Own component so the 1 Hz tick re-renders only the clock. */
function ElapsedClock() {
  const { t } = useTranslation();
  const startedAt = useActiveWorkoutStore((s) => s.startedAt);
  const now = useNow(1000);
  const time = formatClock(elapsedSeconds(startedAt, now));
  return (
    <Text
      accessibilityRole="timer"
      accessibilityLabel={t('workoutLive.header.elapsedA11y', { time })}
      maxFontSizeMultiplier={1.15}
      style={{ ...textStyles.numericM, color: fixedColors.ink }}
    >
      {time}
    </Text>
  );
}

function RestBar() {
  const { t } = useTranslation();
  const restEndsAt = useActiveWorkoutStore((s) => s.restEndsAt);
  const restTotal = useActiveWorkoutStore((s) => s.restTotalSeconds);
  const clearRestTimer = useActiveWorkoutStore((s) => s.clearRestTimer);
  const adjustRest = useActiveWorkoutStore((s) => s.adjustRest);
  const now = useNow(250, restEndsAt !== null);

  const remainingMs = restEndsAt === null ? 0 : restEndsAt - now;
  const expired = restEndsAt !== null && remainingMs <= 0;
  useEffect(() => {
    if (!expired) return;
    clearRestTimer();
    // It may have run out while suspended: only buzz when we're looking at it.
    if (AppState.currentState === 'active') haptic.restDone();
  }, [expired, clearRestTimer]);

  const seconds = restEndsAt === null ? 0 : Math.ceil(remainingMs / 1000);
  const countdownTick = !expired && seconds >= 1 && seconds <= 3 ? seconds : 0;
  useEffect(() => {
    if (countdownTick > 0) haptic.restCountdown();
  }, [countdownTick]);

  if (restEndsAt === null || expired) return null;

  const totalMs =
    Math.max(restTotal ?? DEFAULT_REST_SECONDS, remainingMs / 1000) * 1000;
  const fraction = Math.min(1, Math.max(0, remainingMs / totalMs));
  const time = formatClock(seconds);

  return (
    <View className="flex-row items-center gap-2">
      <View
        accessible
        accessibilityRole="timer"
        accessibilityLabel={t('workoutLive.rest.remainingA11y', { time })}
        className="flex-1 gap-1"
      >
        <View className="flex-row items-baseline gap-2">
          <Text
            maxFontSizeMultiplier={1.3}
            style={{ ...textStyles.callout, color: fixedColors.ink }}
          >
            {t('workoutLive.rest.label')}
          </Text>
          <Text
            maxFontSizeMultiplier={1.15}
            style={{ ...textStyles.numericS, color: fixedColors.ink }}
          >
            {time}
          </Text>
        </View>
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: INK_SOFT,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${fraction * 100}%`,
              height: 4,
              borderRadius: 2,
              backgroundColor: fixedColors.ink,
            }}
          />
        </View>
      </View>
      <RestButton
        label={t('workoutLive.rest.minus')}
        accessibilityLabel={t('workoutLive.rest.minusA11y')}
        onPress={() => adjustRest(-REST_ADJUST_SECONDS)}
      />
      <RestButton
        label={t('workoutLive.rest.plus')}
        accessibilityLabel={t('workoutLive.rest.plusA11y')}
        onPress={() => adjustRest(REST_ADJUST_SECONDS)}
      />
      <RestButton
        symbol
        accessibilityLabel={t('workoutLive.rest.skipA11y')}
        onPress={clearRestTimer}
      />
    </View>
  );
}

function RestButton({
  label,
  symbol = false,
  accessibilityLabel,
  onPress,
}: {
  label?: string;
  symbol?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      onPress={onPress}
      style={{
        minWidth: 40,
        height: 34,
        paddingHorizontal: 10,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: INK_SOFT,
      }}
    >
      {symbol ? (
        <SymbolView
          name="xmark"
          size={13}
          weight="bold"
          tintColor={fixedColors.ink}
        />
      ) : (
        <Text
          maxFontSizeMultiplier={1.2}
          style={{ ...textStyles.callout, color: fixedColors.ink }}
        >
          {label}
        </Text>
      )}
    </PressableScale>
  );
}
