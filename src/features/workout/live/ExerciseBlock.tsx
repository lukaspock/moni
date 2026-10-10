/**
 * One exercise of the live session in focus mode: expanded (sets, progression
 * hint, "+ Set") when focused, otherwise a collapsed row with its progress —
 * tap to focus. Docs/identity/06 §5.
 */
import { useMemo } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SymbolView } from 'expo-symbols';

import { PressableScale, Reveal } from '@/components/motion';
import { Card, Chip } from '@/components/ui';
import {
  estimateOneRepMaxEpley,
  fillFromPrevious,
  type SetField,
  type UnitSystem,
} from '@/domain';
import {
  DEFAULT_REST_SECONDS,
  effectiveSetValues,
  prefillForSet,
  progressionHint,
  topSet,
  type PrefillValues,
} from '@/domain/workoutPrefill';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { getRoutineRepRange } from '../editor/repRangeStore';
import { getBestOneRepMaxKg } from '../finish';
import { ensureRestNotificationPermission } from '../restTimer';
import { useActiveWorkoutStore } from '../session';
import type { ActiveExercise, ActiveSet } from '../types';
import { SetRow, type EditingTarget } from './SetRow';
import { columnsFor, formatNumber, formatSetSummary } from './shared';

/** Live PR check: this set's estimated 1RM beats the stored best (a first-ever set is celebrated on the summary). */
function isLivePR(exerciseId: string, values: PrefillValues): boolean {
  if (values.weightKg === null || values.reps === null || values.reps <= 0)
    return false;
  const best = getBestOneRepMaxKg(exerciseId);
  return (
    best !== null && estimateOneRepMaxEpley(values.weightKg, values.reps) > best
  );
}

export function ExerciseBlock({
  exercise,
  routineId,
  name,
  focused,
  lastSets,
  unitSystem,
  editing,
  onEdit,
  onFocus,
  onOptions,
  onSetCompleted,
  onLayout,
  equipment = null,
  onGroupSetCompleted,
}: {
  exercise: ActiveExercise;
  /** Routine the session was started from (rep range lookup). */
  routineId: string | null;
  name: string;
  focused: boolean;
  lastSets: PrefillValues[] | undefined;
  unitSystem: UnitSystem;
  editing: EditingTarget | null;
  onEdit: (target: EditingTarget | null) => void;
  onFocus: () => void;
  onOptions: () => void;
  /** A set was just checked; `exerciseDone` = no open set left. */
  onSetCompleted: (exerciseDone: boolean) => void;
  onLayout: (e: LayoutChangeEvent) => void;
  /** Catalog equipment; `barbell` enables the plate calculator. */
  equipment?: string | null;
  /**
   * Superset member: called instead of `onSetCompleted` after a set was
   * checked; returns whether the round is over (only then the rest starts).
   */
  onGroupSetCompleted?: () => boolean;
}) {
  const { t } = useTranslation();
  const { exerciseId } = exercise;
  const columns = useMemo(
    () => columnsFor(exercise.trackingType, unitSystem),
    [exercise.trackingType, unitSystem],
  );
  const fields = useMemo<SetField[]>(
    () => columns.map((c) => c.field),
    [columns],
  );
  const targetReps = exercise.targetReps ?? null;
  // Time-based exercises keep minutes per round in target_reps.
  const targetKind =
    exercise.trackingType === 'duration' ||
    exercise.trackingType === 'distance_duration'
      ? 'minutes'
      : 'reps';
  const repRange =
    routineId && targetKind === 'reps'
      ? getRoutineRepRange(
          routineId,
          exerciseId,
          targetReps,
          exercise.targetRepsMin,
        )
      : null;
  const weightColumn = columns.find((c) => c.field === 'weightKg');
  const plateUnit =
    equipment === 'barbell' &&
    weightColumn &&
    (weightColumn.unit === 'kg' || weightColumn.unit === 'lb')
      ? weightColumn.unit
      : null;
  const upperReps = repRange?.max ?? targetReps;

  const rows = exercise.sets.map((set, index) => {
    const prefill = prefillForSet(index, lastSets, targetReps, targetKind);
    return { set, values: effectiveSetValues(set, prefill.values) };
  });
  const done = exercise.sets.filter((s) => s.completedAt !== null).length;
  const total = exercise.sets.length;
  const complete = total > 0 && done >= total;

  const last = topSet(lastSets);
  const lastText = last ? formatSetSummary(t, last, columns) : null;
  const targetText =
    targetReps === null
      ? t('workoutLive.exercise.targetSets', { sets: total })
      : targetKind === 'minutes'
        ? t('workoutLive.exercise.targetMinutes', {
            sets: total,
            minutes: targetReps,
          })
        : repRange && repRange.min < repRange.max
          ? t('workoutLive.exercise.targetRange', {
              sets: total,
              min: repRange.min,
              max: repRange.max,
            })
          : t('workoutLive.exercise.target', { sets: total, reps: targetReps });
  const subtitle =
    lastText !== null
      ? t('workoutLive.exercise.last', { value: lastText })
      : targetText;

  const hint =
    exercise.trackingType === 'weight_reps'
      ? progressionHint(lastSets, upperReps, unitSystem)
      : null;
  const showHint =
    hint !== null &&
    rows.some(
      (r) =>
        r.set.completedAt === null &&
        (r.values.weightKg ?? 0) < hint.suggestedWeightKg - 0.01,
    );

  function toggle(set: ActiveSet, values: PrefillValues) {
    const wasCompleted = set.completedAt !== null;
    onEdit(null);
    if (wasCompleted) haptic.setUndone();
    else if (isLivePR(exerciseId, values)) haptic.setDonePR();
    else haptic.setDone();
    const store = useActiveWorkoutStore.getState();
    store.toggleSetCompleted(exerciseId, set.id, {
      prefill: fillFromPrevious(set, values, fields),
    });
    if (wasCompleted) return;
    // Superset: the group decides (rest only after the last exercise of a round).
    const restNow = onGroupSetCompleted ? onGroupSetCompleted() : true;
    // Cardio rows are one long effort: no rest after them.
    if (restNow && exercise.trackingType !== 'distance_duration') {
      store.startRest(DEFAULT_REST_SECONDS);
      void ensureRestNotificationPermission();
    }
    if (onGroupSetCompleted) return;
    const after = useActiveWorkoutStore
      .getState()
      .exercises.find((e) => e.exerciseId === exerciseId);
    onSetCompleted(!!after && after.sets.every((s) => s.completedAt !== null));
  }

  function addSet() {
    haptic.itemAdded();
    const lastRow = rows[rows.length - 1];
    const values =
      lastRow?.values ??
      prefillForSet(exercise.sets.length, lastSets, targetReps, targetKind)
        .values;
    useActiveWorkoutStore.getState().addSetWithValues(exerciseId, values);
  }

  if (!focused) {
    return (
      <View onLayout={onLayout}>
        <Card
          onPress={onFocus}
          accessibilityLabel={`${name}, ${t('workoutLive.exercise.progressA11y', { done, total })}`}
          accessibilityHint={t('workoutLive.exercise.focusHint')}
          className="flex-row items-center gap-3 px-4 py-3.5"
        >
          <ProgressDot done={done} total={total} />
          <View className="flex-1">
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              className={complete ? 'text-label-secondary' : 'text-label'}
              style={textStyles.headline}
            >
              {name}
            </Text>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              className="text-label-secondary"
              style={textStyles.caption}
            >
              {subtitle}
            </Text>
          </View>
          <Text
            maxFontSizeMultiplier={1.15}
            className={complete ? 'text-tint' : 'text-label-secondary'}
            style={textStyles.numericS}
          >
            {t('workoutLive.exercise.progress', { done, total })}
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View onLayout={onLayout}>
      <Card className="gap-2 px-3 pb-3 pt-4">
        <View className="flex-row items-center gap-3 px-1">
          <ProgressDot done={done} total={total} />
          <View className="flex-1">
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={1.3}
              className="text-label"
              style={textStyles.headline}
            >
              {name}
            </Text>
            <Text
              maxFontSizeMultiplier={1.3}
              className="text-label-secondary"
              style={textStyles.caption}
            >
              {subtitle}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('workoutLive.exercise.options', { name })}
            hitSlop={8}
            onPress={onOptions}
            className="h-11 w-11 items-center justify-center"
          >
            <SymbolView
              name="ellipsis.circle"
              size={22}
              tintColor={themeColor('labelSecondary')}
            />
          </Pressable>
        </View>

        {showHint && hint ? (
          <Reveal rise={4}>
            <View className="flex-row items-center gap-2 px-1">
              <Chip
                label={t('workoutLive.progression.chip', {
                  step: formatNumber(hint.stepDisplay),
                  unit: t(
                    hint.stepUnit === 'lb'
                      ? 'workout.unit.lb'
                      : 'workout.unit.kg',
                  ),
                })}
                symbol="arrow.up"
                selected
                activeStyle="soft"
                accessibilityHint={t('workoutLive.progression.a11y', {
                  step: formatNumber(hint.stepDisplay),
                  unit: t(
                    hint.stepUnit === 'lb'
                      ? 'workout.unit.lb'
                      : 'workout.unit.kg',
                  ),
                })}
                onPress={() => {
                  haptic.select();
                  useActiveWorkoutStore
                    .getState()
                    .applyWeightToOpenSets(exerciseId, hint.suggestedWeightKg);
                }}
              />
              <Text
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
                className="text-label-secondary flex-1"
                style={textStyles.caption}
              >
                {t('workoutLive.progression.hint')}
              </Text>
            </View>
          </Reveal>
        ) : null}

        <Reveal rise={6}>
          <View className="gap-1.5">
            {rows.map(({ set, values }, index) => (
              <SetRow
                key={set.id}
                set={set}
                index={index}
                columns={columns}
                plateUnit={plateUnit}
                values={values}
                editing={editing?.setId === set.id ? editing : null}
                onEdit={onEdit}
                onToggle={() => toggle(set, values)}
                onChange={(field, stored) =>
                  useActiveWorkoutStore
                    .getState()
                    .updateSet(exerciseId, set.id, { [field]: stored })
                }
                onDelete={() => {
                  onEdit(null);
                  useActiveWorkoutStore
                    .getState()
                    .removeSet(exerciseId, set.id);
                }}
              />
            ))}
          </View>
        </Reveal>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('workoutLive.exercise.addSetA11y')}
          haptic={false}
          onPress={addSet}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: 44,
            borderRadius: 14,
            borderCurve: 'continuous',
          }}
        >
          <SymbolView name="plus" size={14} tintColor={themeColor('accent')} />
          <Text
            maxFontSizeMultiplier={1.3}
            className="text-tint"
            style={textStyles.callout}
          >
            {t('workoutLive.exercise.addSet')}
          </Text>
        </PressableScale>
      </Card>
    </View>
  );
}

/** Small status disc: check when complete, else done/total as a ring fill. */
function ProgressDot({ done, total }: { done: number; total: number }) {
  const complete = total > 0 && done >= total;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className="h-7 w-7 items-center justify-center"
    >
      <SymbolView
        name={
          complete
            ? 'checkmark.circle.fill'
            : done > 0
              ? 'circle.lefthalf.filled'
              : 'circle'
        }
        size={22}
        tintColor={
          complete || done > 0
            ? themeColor('accent')
            : themeColor('labelTertiary')
        }
      />
    </View>
  );
}
