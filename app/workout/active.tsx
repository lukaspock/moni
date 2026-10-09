import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';

import { CheckDraw, PressableScale } from '@/components/motion';
import { Card, GlassActionButton, ModalTopBar } from '@/components/ui';
import {
  countSessionSets,
  discardActiveWorkout,
  elapsedSeconds,
  ensureRestNotificationPermission,
  exerciseDisplayName,
  finishActiveWorkout,
  getBestOneRepMaxKg,
  getPreviousSetValues,
  ExercisePickerView,
  useActiveWorkoutStore,
  useExerciseCatalog,
  useLatestWeightKg,
  useRestTimerNotification,
  type ActiveExercise,
  type ActiveSet,
  type LastSetValue,
} from '@/features/workout';
import { useSession } from '@/features/auth';
import { useProfile } from '@/features/targets';
import {
  displayToStored,
  estimateOneRepMaxEpley,
  fillFromPrevious,
  formatClock,
  isIntegerUnit,
  parseNumericInput,
  setInputUnit,
  storedToDisplay,
  type SetField,
  type SetInputUnit,
  type UnitSystem,
} from '@/domain';
import i18n from '@/i18n';
import { haptic } from '@/lib/haptics';
import { fixedColors, themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

const DEFAULT_REST_SECONDS = 90;
const REST_ADJUST_SECONDS = 15;

/** Which editable columns a tracking type shows, in display order. */
const FIELDS_BY_TRACKING: Record<ActiveExercise['trackingType'], SetField[]> = {
  weight_reps: ['weightKg', 'reps'],
  reps: ['reps'],
  duration: ['durationS'],
  distance_duration: ['distanceM', 'durationS'],
};

/** Re-renders its caller every `intervalMs` while `enabled`. */
function useNow(intervalMs: number, enabled: boolean = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    // Catch up immediately when (re-)enabled / after the app was suspended.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs, enabled]);
  return now;
}

const UNIT_LABEL_KEY = {
  kg: 'workout.unit.kg',
  lb: 'workout.unit.lb',
  reps: 'workout.unit.reps',
  sec: 'workout.unit.sec',
  min: 'workout.unit.min',
  km: 'workout.unit.km',
  mi: 'workout.unit.mi',
} as const satisfies Record<SetInputUnit, string>;

function formatInputNumber(value: number): string {
  return new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
}

export default function ActiveWorkoutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { userId } = useSession();
  const { profile } = useProfile();
  const { weightKg } = useLatestWeightKg();
  const { exercises: catalog } = useExerciseCatalog();
  const unitSystem: UnitSystem =
    profile?.unit_system === 'imperial' ? 'imperial' : 'metric';

  const workoutId = useActiveWorkoutStore((s) => s.workoutId);
  const activeExercises = useActiveWorkoutStore((s) => s.exercises);

  useRestTimerNotification();

  // Set once we deliberately leave (finish / cancel): the store is reset right
  // before navigating, and the "no session -> bounce back" guard below must
  // not race with that navigation.
  const leaving = useRef(false);
  useEffect(() => {
    if (!workoutId && !leaving.current) router.back();
  }, [workoutId]);

  const catalogById = useMemo(
    () => new Map(catalog.map((e) => [e.id, e])),
    [catalog],
  );

  // ---- exercise picker: rendered inline (a formSheet over this fullScreenModal showed blank) ----
  const [picking, setPicking] = useState(false);
  const pendingIds = useRef<string[]>([]);
  const [pendingTick, setPendingTick] = useState(0);
  useEffect(() => {
    if (pendingIds.current.length === 0) return;
    // Ids whose catalog entry isn't there yet (fresh custom exercise) wait for the next catalog update.
    const unresolved: string[] = [];
    for (const id of pendingIds.current) {
      const exercise = catalogById.get(id);
      if (!exercise) {
        unresolved.push(id);
        continue;
      }
      useActiveWorkoutStore.getState().addExercise(id, exercise.trackingType); // ignores exercises already in the session
    }
    pendingIds.current = unresolved;
  }, [pendingTick, catalogById]);

  function handlePickerConfirm(ids: string[]) {
    pendingIds.current = [...pendingIds.current, ...ids];
    setPendingTick((n) => n + 1);
    setPicking(false);
  }

  function handleAddExercise() {
    setPicking(true);
  }

  function leaveAndDiscard() {
    leaving.current = true;
    discardActiveWorkout();
    router.back();
  }

  function handleCancel() {
    Alert.alert(
      t('workout.active.cancelConfirmTitle'),
      t('workout.active.cancelConfirmMessage'),
      [
        { text: t('workout.active.keepTraining'), style: 'cancel' },
        {
          text: t('workout.active.cancelWorkout'),
          style: 'destructive',
          onPress: leaveAndDiscard,
        },
      ],
    );
  }

  function finish() {
    if (!userId) {
      Alert.alert(t('workout.active.finishError'));
      return;
    }
    leaving.current = true;
    const result = finishActiveWorkout({
      userId,
      latestWeightKg: weightKg,
      eatBackFactor: profile?.eat_back_factor ?? 0.7,
      exerciseCatalog: catalog,
    });
    if (!result) {
      leaving.current = false;
      Alert.alert(t('workout.active.finishError'));
      return;
    }
    // The finish haptic belongs to the summary's Celebration (no double buzz).
    router.replace({
      pathname: '/workout/summary',
      params: {
        durationMinutes: String(Math.round(result.durationMinutes)),
        kcalBurned: String(result.kcalBurned),
        volumeKg: String(result.volumeKg),
        bonusKcal: String(result.workoutBonusKcal),
        prs: JSON.stringify(result.prs),
      },
    });
  }

  function handleFinish() {
    Keyboard.dismiss();
    const { completedSets, uncheckedSetsWithData } =
      countSessionSets(activeExercises);
    if (completedSets === 0) {
      // Nothing worth saving: offer to throw it away instead of storing an empty workout.
      Alert.alert(
        t('workout.active.discardTitle'),
        t('workout.active.discardMessage'),
        [
          { text: t('workout.active.keepTraining'), style: 'cancel' },
          {
            text: t('workout.active.discard'),
            style: 'destructive',
            onPress: leaveAndDiscard,
          },
        ],
      );
      return;
    }
    if (uncheckedSetsWithData > 0) {
      Alert.alert(
        t('workout.active.uncheckedTitle'),
        t('workout.active.uncheckedMessage'),
        [
          { text: t('workout.active.keepTraining'), style: 'cancel' },
          { text: t('workout.active.finishAnyway'), onPress: finish },
        ],
      );
      return;
    }
    finish();
  }

  if (!workoutId) return null;

  if (picking) {
    return (
      <View className="bg-bg flex-1">
        <ModalTopBar
          title={t('workout.exercisePicker.title')}
          icon="chevron.left"
          label={t('workout.exercisePicker.back')}
          onPress={() => setPicking(false)}
        />
        <ExercisePickerView
          embedded
          mode="multi"
          initialSelectedIds={activeExercises.map((e) => e.exerciseId)}
          onConfirm={handlePickerConfirm}
        />
      </View>
    );
  }

  return (
    <View className="bg-bg flex-1">
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerClassName="gap-5 px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          accessibilityRole="header"
          className="text-label text-center"
          style={textStyles.headline}
        >
          {t('workout.active.title')}
        </Text>

        <View
          className="overflow-hidden"
          style={{ borderRadius: 32, borderCurve: 'continuous' }}
        >
          <LinearGradient
            colors={[fixedColors.ember, fixedColors.emberHot]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ alignItems: 'center', gap: 4, paddingVertical: 24 }}
          >
            <Text
              style={{
                ...textStyles.caption,
                color: fixedColors.ink,
                opacity: 0.75,
                textTransform: 'uppercase',
              }}
            >
              {t('workout.active.elapsedLabel')}
            </Text>
            <ElapsedClock />
            <RestTimer />
          </LinearGradient>
        </View>

        {activeExercises.length === 0 && (
          <Text className="text-label-secondary px-4 text-center text-sm">
            {t('workout.active.emptyExercises')}
          </Text>
        )}
        {activeExercises.map((exercise) => {
          const entry = catalogById.get(exercise.exerciseId);
          return (
            <ExerciseCard
              key={exercise.exerciseId}
              exercise={exercise}
              unitSystem={unitSystem}
              name={
                entry
                  ? exerciseDisplayName(entry, t)
                  : t('workout.active.exerciseLoading')
              }
            />
          );
        })}

        <PressableScale
          accessibilityRole="button"
          onPress={handleAddExercise}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 16,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: themeColor('surface'),
          }}
        >
          <SymbolView
            name="plus.circle.fill"
            size={20}
            tintColor={themeColor('accent')}
          />
          <Text className="text-tint text-base font-semibold">
            {t('workout.active.addExercise')}
          </Text>
        </PressableScale>

        <Pressable
          accessibilityRole="button"
          onPress={handleCancel}
          className="items-center py-3"
        >
          <Text className="text-destructive text-sm font-medium">
            {t('workout.active.cancelWorkout')}
          </Text>
        </Pressable>
      </ScrollView>

      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 bottom-0 px-5"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <GlassActionButton
          label={t('workout.active.finish')}
          symbol="checkmark"
          onPress={handleFinish}
        />
      </View>
    </View>
  );
}

/** Own component so the 1 Hz tick re-renders only the clock, not every input. */
function ElapsedClock() {
  const startedAt = useActiveWorkoutStore((s) => s.startedAt);
  const now = useNow(1000);
  return (
    <Text
      accessibilityRole="timer"
      maxFontSizeMultiplier={1.2}
      style={{ ...textStyles.numericHero, color: fixedColors.ink }}
    >
      {formatClock(elapsedSeconds(startedAt, now))}
    </Text>
  );
}

function RestTimer() {
  const { t } = useTranslation();
  const restEndsAt = useActiveWorkoutStore((s) => s.restEndsAt);
  const clearRestTimer = useActiveWorkoutStore((s) => s.clearRestTimer);
  const adjustRestTimer = useActiveWorkoutStore((s) => s.adjustRestTimer);
  const now = useNow(250, restEndsAt !== null);

  const remainingMs = restEndsAt === null ? 0 : restEndsAt - now;
  const expired = restEndsAt !== null && remainingMs <= 0;
  useEffect(() => {
    if (!expired) return;
    clearRestTimer();
    // The timer may have run out while suspended: only buzz when we're actually looking at it.
    if (AppState.currentState === 'active') haptic.restDone();
  }, [expired, clearRestTimer]);

  const seconds = restEndsAt === null ? 0 : Math.ceil(remainingMs / 1000);
  const countdownTick = !expired && seconds >= 1 && seconds <= 3 ? seconds : 0;
  useEffect(() => {
    if (countdownTick > 0) haptic.restCountdown();
  }, [countdownTick]);

  if (restEndsAt === null || expired) return null;

  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={t('workout.active.restRemaining', {
        time: formatClock(seconds),
      })}
      className="mt-3 items-center gap-2"
    >
      <View className="flex-row items-center gap-2">
        <SymbolView name="timer" size={18} tintColor={fixedColors.ink} />
        <Text
          maxFontSizeMultiplier={1.2}
          style={{ ...textStyles.numericL, color: fixedColors.ink }}
        >
          {formatClock(seconds)}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <RestChip
          label={`−${REST_ADJUST_SECONDS}`}
          accessibilityLabel={t('workout.active.restMinus')}
          onPress={() => adjustRestTimer(-REST_ADJUST_SECONDS)}
        />
        <RestChip
          label={`+${REST_ADJUST_SECONDS}`}
          accessibilityLabel={t('workout.active.restPlus')}
          onPress={() => adjustRestTimer(REST_ADJUST_SECONDS)}
        />
        <RestChip
          label={t('workout.active.skipRest')}
          onPress={clearRestTimer}
        />
      </View>
    </View>
  );
}

function RestChip({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={6}
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(12,15,13,0.14)',
      }}
    >
      <Text style={{ ...textStyles.callout, color: fixedColors.ink }}>
        {label}
      </Text>
    </PressableScale>
  );
}

function ExerciseCard({
  exercise,
  name,
  unitSystem,
}: {
  exercise: ActiveExercise;
  name: string;
  unitSystem: UnitSystem;
}) {
  const { t } = useTranslation();
  const addSet = useActiveWorkoutStore((s) => s.addSet);
  const removeExercise = useActiveWorkoutStore((s) => s.removeExercise);
  const previousValues = useMemo(
    () => getPreviousSetValues(exercise.exerciseId),
    [exercise.exerciseId],
  );
  const fields = FIELDS_BY_TRACKING[exercise.trackingType];
  const columns = fields.map((field) => ({
    field,
    unit: setInputUnit(field, exercise.trackingType, unitSystem),
  }));

  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text
          accessibilityRole="header"
          className="text-label flex-1"
          style={textStyles.title}
        >
          {name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('workout.active.removeExercise')}
          hitSlop={10}
          onPress={() =>
            Alert.alert(name, undefined, [
              { text: t('workout.active.cancel'), style: 'cancel' },
              {
                text: t('workout.active.removeExercise'),
                style: 'destructive',
                onPress: () => removeExercise(exercise.exerciseId),
              },
            ])
          }
        >
          <SymbolView
            name="ellipsis"
            size={20}
            tintColor={themeColor('labelSecondary')}
          />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-2 px-1">
        <Text className="text-label-secondary w-10 text-center text-xs font-semibold uppercase">
          {t('workout.active.setColumn')}
        </Text>
        {columns.map((c) => (
          <Text
            key={c.field}
            className="text-label-secondary flex-1 text-center text-xs font-semibold uppercase"
          >
            {t(UNIT_LABEL_KEY[c.unit])}
          </Text>
        ))}
        <View className="w-11">
          <SymbolView
            name="checkmark"
            size={12}
            tintColor={themeColor('labelSecondary')}
            style={{ alignSelf: 'center' }}
          />
        </View>
      </View>

      {exercise.sets.map((set, index) => (
        <SetRow
          key={set.id}
          exerciseId={exercise.exerciseId}
          columns={columns}
          set={set}
          index={index}
          previous={previousValues[index]}
          targetReps={exercise.targetReps ?? null}
        />
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={() => addSet(exercise.exerciseId)}
        className="bg-bg flex-row items-center justify-center gap-2 rounded-xl py-3"
      >
        <SymbolView name="plus" size={14} tintColor={themeColor('accent')} />
        <Text className="text-tint text-sm font-semibold">
          {t('workout.active.addSet')}
        </Text>
      </Pressable>
    </Card>
  );
}

type Column = { field: SetField; unit: SetInputUnit };

/** Live PR check: this set's estimated 1RM beats the stored best (a first-ever set is celebrated on the summary). */
function isLivePR(exerciseId: string, set: ActiveSet): boolean {
  if (set.weightKg === null || set.reps === null || set.reps <= 0) return false;
  const best = getBestOneRepMaxKg(exerciseId);
  return best !== null && estimateOneRepMaxEpley(set.weightKg, set.reps) > best;
}

function SetRow({
  exerciseId,
  columns,
  set,
  index,
  previous,
  targetReps,
}: {
  exerciseId: string;
  columns: Column[];
  set: ActiveSet;
  index: number;
  previous?: LastSetValue;
  targetReps: number | null;
}) {
  const { t } = useTranslation();
  const updateSet = useActiveWorkoutStore((s) => s.updateSet);
  const toggleSetCompleted = useActiveWorkoutStore((s) => s.toggleSetCompleted);
  const removeSet = useActiveWorkoutStore((s) => s.removeSet);
  const completed = set.completedAt !== null;

  function handleToggle() {
    Keyboard.dismiss();
    if (completed) {
      haptic.setUndone();
    } else if (isLivePR(exerciseId, set)) {
      haptic.setDonePR();
    } else {
      haptic.setDone();
    }
    const hint = { ...previous, reps: previous?.reps ?? targetReps };
    toggleSetCompleted(exerciseId, set.id, {
      restSeconds: DEFAULT_REST_SECONDS,
      prefill: fillFromPrevious(
        set,
        hint,
        columns.map((c) => c.field),
      ),
    });
    if (!completed) void ensureRestNotificationPermission();
  }

  const setNumber = index + 1;
  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('workout.active.deleteSet')}
          onPress={() => removeSet(exerciseId, set.id)}
          className="bg-destructive ml-2 w-16 items-center justify-center rounded-xl"
        >
          <SymbolView name="trash" size={20} tintColor={fixedColors.paper} />
        </Pressable>
      )}
    >
      <View
        accessible={false}
        accessibilityActions={[
          { name: 'delete', label: t('workout.active.deleteSet') },
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'delete')
            removeSet(exerciseId, set.id);
        }}
        className={`flex-row items-center gap-2 rounded-xl px-1 py-1 ${
          completed ? 'bg-tint-soft' : ''
        }`}
      >
        <Text
          className="text-label-secondary w-10 text-center"
          style={textStyles.numericS}
        >
          {setNumber}
        </Text>
        {columns.map(({ field, unit }) => (
          <SetInput
            key={field}
            value={set[field]}
            unit={unit}
            placeholder={
              field === 'reps'
                ? (previous?.reps ?? targetReps)
                : (previous?.[field] ?? null)
            }
            label={t('workout.active.setInputLabel', {
              field: t(UNIT_LABEL_KEY[unit]),
              set: setNumber,
            })}
            onCommit={(next) =>
              updateSet(exerciseId, set.id, { [field]: next })
            }
          />
        ))}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={t('workout.active.completeSet', {
            set: setNumber,
          })}
          accessibilityState={{ checked: completed }}
          onPress={handleToggle}
          className="h-11 w-11 items-center justify-center"
        >
          <CheckDraw checked={completed} size={30} />
        </Pressable>
      </View>
    </Swipeable>
  );
}

/**
 * Numeric input in the user's unit. The text being typed is kept locally
 * (`draft`) so "8." / "82," survive re-renders; the store always gets the
 * metric value (hard rule #4), or null while the text isn't a number.
 */
function SetInput({
  value,
  unit,
  placeholder,
  label,
  onCommit,
}: {
  value: number | null;
  unit: SetInputUnit;
  /** previous value in stored (metric) units, or the routine's target reps */
  placeholder: number | null;
  label: string;
  onCommit: (stored: number | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const integer = isIntegerUnit(unit);
  const text =
    draft ??
    (value === null ? '' : formatInputNumber(storedToDisplay(value, unit)));

  return (
    <TextInput
      accessibilityLabel={label}
      value={text}
      onChangeText={(next) => {
        setDraft(next);
        const parsed = parseNumericInput(next, integer);
        onCommit(parsed === null ? null : displayToStored(parsed, unit));
      }}
      onBlur={() => setDraft(null)}
      placeholder={
        placeholder !== null
          ? formatInputNumber(storedToDisplay(placeholder, unit))
          : '-'
      }
      placeholderTextColor={themeColor('labelTertiary')}
      keyboardType={integer ? 'number-pad' : 'decimal-pad'}
      maxLength={7}
      selectTextOnFocus
      className="bg-bg text-label h-11 flex-1 rounded-xl text-center"
      style={textStyles.numericM}
    />
  );
}
