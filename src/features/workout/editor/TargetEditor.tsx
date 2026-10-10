import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SymbolView } from 'expo-symbols';

import { Chip } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

import {
  MINUTES_MAX,
  MINUTES_MIN,
  REPS_MAX,
  REPS_MIN,
  SETS_MAX,
  SETS_MIN,
  hasRange,
  stepMinutes,
  targetKind,
  toggleRange,
  withRepsMax,
  withRepsMin,
  withSets,
  type DraftExercise,
} from './routineDraft';

/**
 * Inline target steppers under an exercise row (training revamp §3): sets
 * 1–8, reps 1–30 with an optional range, or rounds + minutes for time-based
 * exercises. No keyboard.
 */
export function TargetEditor({
  draft,
  onChange,
  onDone,
}: {
  draft: DraftExercise;
  onChange: (next: DraftExercise) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const kind = targetKind(draft.trackingType);
  const range = hasRange(draft);

  return (
    <View
      className="bg-surface-raised mx-4 mb-3 gap-1 rounded-inner px-3 py-2"
      style={{ borderCurve: 'continuous' }}
    >
      <Stepper
        label={
          kind === 'minutes'
            ? t('routineEditor.target.rounds')
            : t('routineEditor.target.sets')
        }
        value={draft.sets}
        min={SETS_MIN}
        max={SETS_MAX}
        onChange={(v) => onChange(withSets(draft, v))}
      />
      {kind === 'minutes' ? (
        <Stepper
          label={t('routineEditor.target.minutes')}
          value={draft.repsMax}
          min={MINUTES_MIN}
          max={MINUTES_MAX}
          step={stepMinutes}
          onChange={(v) => onChange(withRepsMax(draft, v))}
        />
      ) : range ? (
        <>
          <Stepper
            label={t('routineEditor.target.repsFrom')}
            value={draft.repsMin}
            min={REPS_MIN}
            max={REPS_MAX}
            onChange={(v) => onChange(withRepsMin(draft, v))}
          />
          <Stepper
            label={t('routineEditor.target.repsTo')}
            value={draft.repsMax}
            min={REPS_MIN}
            max={REPS_MAX}
            onChange={(v) => onChange(withRepsMax(draft, v))}
          />
        </>
      ) : (
        <Stepper
          label={t('routineEditor.target.reps')}
          value={draft.repsMax}
          min={REPS_MIN}
          max={REPS_MAX}
          onChange={(v) => onChange(withRepsMax(draft, v))}
        />
      )}
      <View className="flex-row items-center justify-between pt-1">
        {kind === 'reps' ? (
          <Chip
            label={t('routineEditor.target.range')}
            symbol="arrow.left.and.right"
            selected={range}
            activeStyle="soft"
            onPress={() => {
              haptic.toggle();
              onChange(toggleRange(draft));
            }}
          />
        ) : (
          <View />
        )}
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          hitSlop={8}
          className="min-h-[44px] justify-center px-2"
        >
          <Text className="text-tint text-base font-semibold">
            {t('routineEditor.target.done')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Custom step (e.g. minutes), default ±1. */
  step?: (value: number, dir: 1 | -1) => number;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  const next = (dir: 1 | -1) => {
    const v = step ? step(value, dir) : value + dir;
    return Math.min(max, Math.max(min, v));
  };
  const change = (dir: 1 | -1) => {
    const v = next(dir);
    if (v === value) return;
    haptic.select();
    onChange(v);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: String(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) =>
        change(e.nativeEvent.actionName === 'increment' ? 1 : -1)
      }
      className="min-h-[48px] flex-row items-center"
    >
      <Text
        maxFontSizeMultiplier={1.4}
        className="text-label-secondary flex-1 text-sm"
      >
        {label}
      </Text>
      <StepButton
        symbol="minus"
        label={t('routineEditor.stepper.decrease', { label })}
        disabled={value <= min}
        onPress={() => change(-1)}
      />
      <Text
        maxFontSizeMultiplier={1.15}
        className="text-label w-12 text-center"
        style={textStyles.numericS}
      >
        {value}
      </Text>
      <StepButton
        symbol="plus"
        label={t('routineEditor.stepper.increase', { label })}
        disabled={value >= max}
        onPress={() => change(1)}
      />
    </View>
  );
}

function StepButton({
  symbol,
  label,
  disabled,
  onPress,
}: {
  symbol: 'plus' | 'minus';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      className={`bg-surface-high h-11 w-11 items-center justify-center rounded-full active:opacity-70 ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <SymbolView
        name={symbol}
        size={15}
        weight="bold"
        tintColor={themeColor('label')}
      />
    </Pressable>
  );
}
