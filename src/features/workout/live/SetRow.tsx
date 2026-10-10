/**
 * One set in the live session: number, big tabular values (pre-filled), a
 * large check on the right. Tap a value -> compact stepper right below the
 * row (±2.5 kg / ±1 rep, hold = faster); long press -> keyboard as the
 * escape hatch. Swipe left to delete. Docs/identity/06 §5.
 * Barbell exercises get a plate calculator button in the weight stepper.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { SymbolView } from 'expo-symbols';

import { CheckDraw, PressableScale, Reveal } from '@/components/motion';
import {
  displayToStored,
  isIntegerUnit,
  parseNumericInput,
  type SetField,
} from '@/domain';
import {
  holdRepeatInterval,
  holdStepMultiplier,
  stepStoredValue,
  type PrefillValues,
} from '@/domain/workoutPrefill';
import type { PlateUnit } from '@/domain/plates';
import { haptic } from '@/lib/haptics';
import { fixedColors, themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import type { ActiveSet } from '../types';
import {
  displayText,
  fieldLabel,
  formatNumber,
  unitLabel,
  type Column,
} from './shared';
import { PlateCalculator } from './PlateCalculator';

export interface EditingTarget {
  setId: string;
  field: SetField;
  keyboard: boolean;
}

export function SetRow({
  set,
  index,
  columns,
  values,
  editing,
  onEdit,
  onToggle,
  onChange,
  onDelete,
  plateUnit = null,
}: {
  set: ActiveSet;
  index: number;
  columns: Column[];
  /** What the row shows: own values, else the pre-fill (metric). */
  values: PrefillValues;
  /** The field of THIS set being edited, if any. */
  editing: EditingTarget | null;
  onEdit: (target: EditingTarget | null) => void;
  onToggle: () => void;
  onChange: (field: SetField, stored: number | null) => void;
  onDelete: () => void;
  /** Barbell exercise: unit for the plate calculator (null = no calculator). */
  plateUnit?: PlateUnit | null;
}) {
  const { t } = useTranslation();
  const [platesOpen, setPlatesOpen] = useState(false);
  const completed = set.completedAt !== null;
  const setNumber = index + 1;
  const editingColumn = editing
    ? columns.find((c) => c.field === editing.field)
    : undefined;

  return (
    <View>
      <Swipeable
        overshootRight={false}
        renderRightActions={() => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('workoutLive.set.delete')}
            onPress={onDelete}
            className="bg-destructive ml-2 w-16 items-center justify-center rounded-xl"
          >
            <SymbolView name="trash" size={20} tintColor={fixedColors.paper} />
          </Pressable>
        )}
      >
        <View
          accessibilityActions={[
            { name: 'delete', label: t('workoutLive.set.delete') },
          ]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'delete') onDelete();
          }}
          className={`flex-row items-center gap-2 rounded-2xl py-1 pl-1 ${
            completed ? 'bg-tint-soft' : 'bg-surface'
          }`}
          style={{ borderCurve: 'continuous' }}
        >
          <Text
            importantForAccessibility="no"
            accessibilityElementsHidden
            maxFontSizeMultiplier={1.15}
            className={`w-8 text-center ${
              completed ? 'text-tint' : 'text-label-secondary'
            }`}
            style={textStyles.numericS}
          >
            {setNumber}
          </Text>
          {columns.map((column) => (
            <ValueButton
              key={column.field}
              column={column}
              stored={values[column.field]}
              setNumber={setNumber}
              active={editing?.field === column.field}
              onPress={() =>
                onEdit(
                  editing?.field === column.field
                    ? null
                    : { setId: set.id, field: column.field, keyboard: false },
                )
              }
              onLongPress={() =>
                onEdit({ setId: set.id, field: column.field, keyboard: true })
              }
              onStep={(direction) =>
                onChange(
                  column.field,
                  stepStoredValue(values[column.field], direction, column.unit),
                )
              }
            />
          ))}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={t('workoutLive.set.check', { set: setNumber })}
            accessibilityState={{ checked: completed }}
            onPress={onToggle}
            hitSlop={4}
            className="h-14 w-14 items-center justify-center"
          >
            <CheckDraw checked={completed} size={34} />
          </Pressable>
        </View>
      </Swipeable>

      {editing && editingColumn ? (
        <Reveal rise={4}>
          <ValueStepper
            key={`${editing.field}-${editing.keyboard ? 'k' : 's'}`}
            column={editingColumn}
            stored={values[editing.field]}
            keyboard={editing.keyboard}
            onChange={(next) => onChange(editing.field, next)}
            onKeyboard={() => onEdit({ ...editing, keyboard: true })}
            onClose={() => onEdit(null)}
            onPlates={
              plateUnit && editing.field === 'weightKg'
                ? () => setPlatesOpen((open) => !open)
                : undefined
            }
          />
        </Reveal>
      ) : null}
      {plateUnit && platesOpen && editing?.field === 'weightKg' ? (
        <Reveal rise={4}>
          <PlateCalculator
            stored={values.weightKg}
            unit={plateUnit}
            onClose={() => setPlatesOpen(false)}
          />
        </Reveal>
      ) : null}
    </View>
  );
}

function ValueButton({
  column,
  stored,
  setNumber,
  active,
  onPress,
  onLongPress,
  onStep,
}: {
  column: Column;
  stored: number | null;
  setNumber: number;
  active: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onStep: (direction: 1 | -1) => void;
}) {
  const { t } = useTranslation();
  const text = displayText(stored, column.unit);
  const unit = unitLabel(t, column.unit);
  const field = fieldLabel(t, column.field);
  return (
    <PressableScale
      preset="subtle"
      haptic={false}
      accessibilityRole="adjustable"
      accessibilityLabel={t('workoutLive.set.valueA11y', {
        field,
        set: setNumber,
        value: text === null ? t('workoutLive.set.empty') : `${text} ${unit}`,
      })}
      accessibilityHint={t('workoutLive.set.valueHint')}
      accessibilityActions={[
        { name: 'increment' },
        { name: 'decrement' },
        { name: 'longpress' },
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onStep(1);
        else if (e.nativeEvent.actionName === 'decrement') onStep(-1);
        else if (e.nativeEvent.actionName === 'longpress') onLongPress();
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={{
        flex: 1,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderRadius: 12,
        borderCurve: 'continuous',
        backgroundColor: active ? themeColor('accentSoft') : undefined,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.15}
        className={text === null ? 'text-label-tertiary' : 'text-label'}
        style={textStyles.numericM}
      >
        {text ?? '–'}
      </Text>
      {text !== null && column.unit !== 'reps' ? (
        <Text
          maxFontSizeMultiplier={1.3}
          className="text-label-secondary"
          style={textStyles.caption}
        >
          {unit}
        </Text>
      ) : null}
    </PressableScale>
  );
}

/** Press = one step, hold = repeating and accelerating steps. */
function useHoldRepeat(onStep: (multiplier: number) => void) {
  const stepRef = useRef(onStep);
  useEffect(() => {
    stepRef.current = onStep;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeats = useRef(0);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    repeats.current = 0;
  }, []);
  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    stop();
    const run = () => {
      stepRef.current(holdStepMultiplier(repeats.current));
      repeats.current += 1;
      timer.current = setTimeout(run, holdRepeatInterval(repeats.current));
    };
    run();
  }, [stop]);

  return {
    onPress: () => stepRef.current(1),
    onLongPress: start,
    onPressOut: stop,
  };
}

function ValueStepper({
  column,
  stored,
  keyboard,
  onChange,
  onKeyboard,
  onClose,
  onPlates,
}: {
  column: Column;
  stored: number | null;
  keyboard: boolean;
  onChange: (stored: number | null) => void;
  onKeyboard: () => void;
  onClose: () => void;
  /** Toggles the plate calculator (barbell weight only). */
  onPlates?: () => void;
}) {
  const { t } = useTranslation();
  const field = fieldLabel(t, column.field);
  // Latest value for repeated steps while a button is held.
  const storedRef = useRef(stored);
  useEffect(() => {
    storedRef.current = stored;
  }, [stored]);

  function stepBy(direction: 1 | -1, multiplier: number) {
    const next = stepStoredValue(
      storedRef.current,
      direction,
      column.unit,
      multiplier,
    );
    if (next === storedRef.current) return;
    storedRef.current = next;
    haptic.select();
    onChange(next);
  }
  const minus = useHoldRepeat((m) => stepBy(-1, m));
  const plus = useHoldRepeat((m) => stepBy(1, m));

  return (
    <View
      className="bg-surface-raised mt-1 flex-row items-center gap-2 rounded-2xl p-2"
      style={{ borderCurve: 'continuous' }}
    >
      <StepButton
        symbol="minus"
        label={t('workoutLive.stepper.decrease', { field })}
        {...minus}
      />
      <View className="flex-1 items-center">
        {keyboard ? (
          <KeyboardInput
            column={column}
            stored={stored}
            label={field}
            onChange={onChange}
            onDone={onClose}
          />
        ) : (
          <Text
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={1.15}
            className="text-label"
            style={textStyles.numericL}
          >
            {displayText(stored, column.unit) ?? '–'}
          </Text>
        )}
        <Text
          maxFontSizeMultiplier={1.3}
          className="text-label-secondary"
          style={textStyles.caption}
        >
          {`${field} · ${unitLabel(t, column.unit)}`}
        </Text>
      </View>
      <StepButton
        symbol="plus"
        label={t('workoutLive.stepper.increase', { field })}
        {...plus}
      />
      <View className="gap-1">
        {onPlates ? (
          <SmallIconButton
            symbol="scalemass"
            label={t('workoutLive.plates.open')}
            onPress={onPlates}
          />
        ) : null}
        {!keyboard ? (
          <SmallIconButton
            symbol="keyboard"
            label={t('workoutLive.stepper.keyboard')}
            onPress={onKeyboard}
          />
        ) : null}
        <SmallIconButton
          symbol="xmark"
          label={t('workoutLive.stepper.close')}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />
      </View>
    </View>
  );
}

function StepButton({
  symbol,
  label,
  onPress,
  onLongPress,
  onPressOut,
}: {
  symbol: 'minus' | 'plus';
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  onPressOut: () => void;
}) {
  return (
    <PressableScale
      preset="strong"
      haptic={false}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      delayLongPress={300}
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: themeColor('accentSoft'),
      }}
    >
      <SymbolView
        name={symbol}
        size={20}
        weight="bold"
        tintColor={themeColor('accent')}
      />
    </PressableScale>
  );
}

function SmallIconButton({
  symbol,
  label,
  onPress,
}: {
  symbol: 'keyboard' | 'xmark' | 'scalemass';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      className="h-8 w-8 items-center justify-center rounded-full"
    >
      <SymbolView
        name={symbol}
        size={15}
        tintColor={themeColor('labelSecondary')}
      />
    </Pressable>
  );
}

/**
 * Keyboard escape hatch. The typed text is kept locally so "8." / "82,"
 * survive re-renders; the store always gets the metric value (hard rule #4).
 */
function KeyboardInput({
  column,
  stored,
  label,
  onChange,
  onDone,
}: {
  column: Column;
  stored: number | null;
  label: string;
  onChange: (stored: number | null) => void;
  onDone: () => void;
}) {
  const integer = isIntegerUnit(column.unit);
  const [draft, setDraft] = useState(
    () => displayText(stored, column.unit) ?? '',
  );
  return (
    <TextInput
      accessibilityLabel={label}
      autoFocus
      value={draft}
      onChangeText={(next) => {
        setDraft(next);
        const parsed = parseNumericInput(next, integer);
        onChange(parsed === null ? null : displayToStored(parsed, column.unit));
      }}
      onSubmitEditing={onDone}
      placeholder={formatNumber(0)}
      placeholderTextColor={themeColor('labelTertiary')}
      keyboardType={integer ? 'number-pad' : 'decimal-pad'}
      returnKeyType="done"
      maxLength={7}
      selectTextOnFocus
      className="text-label min-w-20 text-center"
      style={textStyles.numericL}
    />
  );
}
