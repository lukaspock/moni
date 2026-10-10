import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { PressableScale } from '@/components/motion';
import { ModalTopBar } from '@/components/ui';
import {
  countSessionSets,
  discardActiveWorkout,
  exerciseDisplayName,
  finishActiveWorkout,
  ExercisePickerView,
  useActiveWorkoutStore,
  useExerciseCatalog,
  useLastSessionSets,
  useLatestWeightKg,
  useRestTimerNotification,
  useRoutines,
} from '@/features/workout';
import { ExerciseBlock } from '@/features/workout/live/ExerciseBlock';
import { LiveHeader } from '@/features/workout/live/LiveHeader';
import type { EditingTarget } from '@/features/workout/live/SetRow';
import { useSession } from '@/features/auth';
import { useProfile } from '@/features/targets';
import type { UnitSystem } from '@/domain';
import { initialFocusIndex, nextFocusIndex } from '@/domain/workoutPrefill';
import {
  afterGroupSet,
  supersetBlocks,
  supersetKind,
  supersetRound,
} from '@/domain/supersets';
import type { ActiveExercise } from '@/features/workout';
import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import {
  useWorkoutLiveActivity,
  type WorkoutActivityLabels,
} from '@/features/liveActivity';

/** Lets the check animation land before the next exercise opens. */
const FOCUS_ADVANCE_DELAY_MS = 450;

type PickerState = { kind: 'add' } | { kind: 'swap'; fromId: string } | null;
type PendingOp =
  { kind: 'add'; id: string } | { kind: 'swap'; fromId: string; id: string };

/**
 * Live session, "one tap per set" (docs/identity/06 §5): compact ember head
 * with an always visible "Done" and a slim rest bar; focus mode (one exercise
 * open, the rest collapsed with progress); every set pre-filled from the last
 * session or the routine target; values change by stepper, keyboard only on
 * long press. Finishing ignores unchecked sets without asking; only
 * discarding asks.
 */
export default function ActiveWorkoutScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { userId } = useSession();
  const { profile } = useProfile();
  const { weightKg } = useLatestWeightKg();
  const { exercises: catalog } = useExerciseCatalog();
  const { routines } = useRoutines();
  const unitSystem: UnitSystem =
    profile?.unit_system === 'imperial' ? 'imperial' : 'metric';

  const workoutId = useActiveWorkoutStore((s) => s.workoutId);
  const routineId = useActiveWorkoutStore((s) => s.routineId);
  const activeExercises = useActiveWorkoutStore((s) => s.exercises);

  useRestTimerNotification();

  // Set once we deliberately leave (finish / discard): the store is reset right
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
  const exerciseIds = useMemo(
    () => activeExercises.map((e) => e.exerciseId),
    [activeExercises],
  );
  const lastSetsById = useLastSessionSets(exerciseIds, workoutId);

  const routineName = routineId
    ? routines.find((r) => r.id === routineId)?.name
    : undefined;

  // ---- focus mode ----
  const [focusOverride, setFocusOverride] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const progress = activeExercises.map((e) => ({
    done: e.sets.filter((s) => s.completedAt !== null).length,
    total: e.sets.length,
  }));
  const overrideIndex = focusOverride ? exerciseIds.indexOf(focusOverride) : -1;
  const focusIndex =
    overrideIndex !== -1 ? overrideIndex : initialFocusIndex(progress);
  const focusedId = focusIndex === null ? null : exerciseIds[focusIndex];

  // Lock screen + Dynamic Island (no-op where Live Activities aren't supported).
  const activityLabels = useMemo<WorkoutActivityLabels>(
    () => ({
      locale: i18n.language,
      setOf: (current, total) =>
        t('workoutLive.liveActivity.setOf', { current, total }),
      weightReps: (weight, unit, reps) =>
        t('workoutLive.liveActivity.weightReps', { weight, unit, reps }),
      weight: (weight, unit) =>
        t('workoutLive.liveActivity.weight', { weight, unit }),
      reps: (count) => t('workoutLive.liveActivity.reps', { count }),
      rest: t('workoutLive.liveActivity.rest'),
      elapsed: t('workoutLive.liveActivity.elapsed'),
    }),
    [t, i18n.language],
  );
  const activityExerciseName = useCallback(
    (id: string) => {
      const entry = catalogById.get(id);
      return entry ? exerciseDisplayName(entry, t) : '';
    },
    [catalogById, t],
  );
  useWorkoutLiveActivity({
    routineName: routineName ?? t('workoutLive.header.title'),
    focusedExerciseId: focusedId,
    exerciseName: activityExerciseName,
    unit: unitSystem === 'imperial' ? 'lb' : 'kg',
    labels: activityLabels,
  });

  const scrollRef = useRef<ScrollView>(null);
  const pendingScrollId = useRef<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  function focusExercise(id: string) {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    Keyboard.dismiss();
    setEditing(null);
    pendingScrollId.current = id;
    setFocusOverride(id);
  }

  function handleSetCompleted(exerciseId: string, exerciseDone: boolean) {
    // Pin the current focus, so the derived focus doesn't jump before the delay.
    setFocusOverride(exerciseId);
    if (!exerciseDone || exerciseId !== focusedId) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      const { exercises } = useActiveWorkoutStore.getState();
      const from = exercises.findIndex((e) => e.exerciseId === exerciseId);
      const next = nextFocusIndex(
        exercises.map((e) => ({
          done: e.sets.filter((s) => s.completedAt !== null).length,
          total: e.sets.length,
        })),
        Math.max(0, from),
      );
      if (next === null) return;
      const nextId = exercises[next]!.exerciseId;
      pendingScrollId.current = nextId;
      setFocusOverride(nextId);
    }, FOCUS_ADVANCE_DELAY_MS);
  }

  /**
   * Superset/circuit member checked a set: alternate A1 -> B1 -> rest -> A2.
   * Focus moves to the next member of the round (or past the group when it
   * is done). Returns whether the round is complete (= start the rest).
   */
  function handleGroupSetCompleted(
    exerciseId: string,
    memberIds: readonly string[],
  ): boolean {
    setFocusOverride(exerciseId);
    const progressOf = (e: ActiveExercise | undefined) => ({
      done: e ? e.sets.filter((s) => s.completedAt !== null).length : 0,
      total: e ? e.sets.length : 0,
    });
    const { exercises } = useActiveWorkoutStore.getState();
    const members = memberIds.map((id) =>
      progressOf(exercises.find((e) => e.exerciseId === id)),
    );
    const { next, rest } = afterGroupSet(
      members,
      memberIds.indexOf(exerciseId),
    );
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      let nextId: string | null = null;
      if (next !== null) {
        nextId = memberIds[next] ?? null;
      } else {
        // Group done: continue with the next unfinished exercise after it.
        const all = useActiveWorkoutStore.getState().exercises;
        const lastId = memberIds[memberIds.length - 1];
        const from = all.findIndex((e) => e.exerciseId === lastId);
        const n = nextFocusIndex(all.map(progressOf), Math.max(0, from));
        nextId = n === null ? null : all[n]!.exerciseId;
      }
      if (!nextId || nextId === exerciseId) return;
      setEditing(null);
      pendingScrollId.current = nextId;
      setFocusOverride(nextId);
    }, FOCUS_ADVANCE_DELAY_MS);
    return rest;
  }

  // Absolute y of each superset wrapper (members report y relative to it).
  const groupY = useRef<Record<string, number>>({});
  function rememberGroupY(groupKey: string, y: number) {
    groupY.current[groupKey] = y;
  }
  function scrollToGroupMember(id: string, groupKey: string, y: number) {
    scrollToIfPending(id, (groupY.current[groupKey] ?? 0) + y);
  }
  function scrollToIfPending(id: string, y: number) {
    if (pendingScrollId.current !== id || id !== focusedId) return;
    pendingScrollId.current = null;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }

  // ---- exercise picker: rendered inline (a formSheet over this fullScreenModal showed blank) ----
  const [picker, setPicker] = useState<PickerState>(null);
  const pendingOps = useRef<PendingOp[]>([]);
  const [pendingTick, setPendingTick] = useState(0);
  useEffect(() => {
    if (pendingOps.current.length === 0) return;
    // A fresh custom exercise isn't in the catalog yet: wait for the next catalog update.
    const unresolved: PendingOp[] = [];
    const store = useActiveWorkoutStore.getState();
    for (const op of pendingOps.current) {
      const exercise = catalogById.get(op.id);
      if (!exercise) {
        unresolved.push(op);
        continue;
      }
      if (op.kind === 'add') {
        store.addExercise(op.id, exercise.trackingType); // ignores exercises already in the session
      } else {
        store.replaceExercise(op.fromId, op.id, exercise.trackingType);
      }
    }
    pendingOps.current = unresolved;
  }, [pendingTick, catalogById]);

  function handlePickerConfirm(ids: string[]) {
    const current = picker;
    setPicker(null);
    const id = ids[0];
    if (!current || !id) return;
    pendingOps.current = [
      ...pendingOps.current,
      current.kind === 'add'
        ? { kind: 'add', id }
        : { kind: 'swap', fromId: current.fromId, id },
    ];
    setPendingTick((n) => n + 1);
    // Already in the session: just jump to it.
    if (current.kind === 'add' || !exerciseIds.includes(id)) {
      focusExercise(id);
    }
  }

  function openOptions(exerciseId: string, name: string) {
    Keyboard.dismiss();
    setEditing(null);
    const options = [
      t('workoutLive.exercise.swap'),
      t('workoutLive.exercise.remove'),
      t('workoutLive.exercise.cancel'),
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: name,
        options,
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (index) => {
        if (index === 0) setPicker({ kind: 'swap', fromId: exerciseId });
        else if (index === 1)
          useActiveWorkoutStore.getState().removeExercise(exerciseId);
      },
    );
  }

  // ---- finish / discard ----
  function leaveAndDiscard() {
    leaving.current = true;
    discardActiveWorkout();
    router.back();
  }

  function confirmDiscard(empty: boolean) {
    Alert.alert(
      t(empty ? 'workoutLive.discard.emptyTitle' : 'workoutLive.discard.title'),
      t(
        empty
          ? 'workoutLive.discard.emptyMessage'
          : 'workoutLive.discard.message',
      ),
      [
        { text: t('workoutLive.discard.keep'), style: 'cancel' },
        {
          text: t('workoutLive.discard.confirm'),
          style: 'destructive',
          onPress: leaveAndDiscard,
        },
      ],
    );
  }

  function handleFinish() {
    Keyboard.dismiss();
    setEditing(null);
    // Unchecked sets are simply not saved (finishActiveWorkout only takes checked ones).
    if (countSessionSets(activeExercises).completedSets === 0) {
      confirmDiscard(true);
      return;
    }
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

  function renderExercise(
    exercise: ActiveExercise,
    group?: { key: string; memberIds: readonly string[] },
  ) {
    const entry = catalogById.get(exercise.exerciseId);
    const name = entry
      ? exerciseDisplayName(entry, t)
      : t('workoutLive.exercise.loading');
    const id = exercise.exerciseId;
    return (
      <ExerciseBlock
        key={id}
        exercise={exercise}
        routineId={routineId}
        name={name}
        focused={id === focusedId}
        lastSets={lastSetsById[id]}
        unitSystem={unitSystem}
        editing={id === focusedId ? editing : null}
        onEdit={setEditing}
        onFocus={() => focusExercise(id)}
        onOptions={() => openOptions(id, name)}
        onSetCompleted={(done) => handleSetCompleted(id, done)}
        equipment={entry?.equipment ?? null}
        onGroupSetCompleted={
          group ? () => handleGroupSetCompleted(id, group.memberIds) : undefined
        }
        onLayout={(e) =>
          group
            ? scrollToGroupMember(id, group.key, e.nativeEvent.layout.y)
            : scrollToIfPending(id, e.nativeEvent.layout.y)
        }
      />
    );
  }

  if (!workoutId) return null;

  if (picker) {
    return (
      <View className="bg-bg flex-1">
        <ModalTopBar
          title={
            picker.kind === 'swap'
              ? t('workoutLive.swapTitle')
              : t('workout.exercisePicker.title')
          }
          icon="chevron.left"
          label={t('workout.exercisePicker.back')}
          onPress={() => setPicker(null)}
        />
        <ExercisePickerView
          embedded
          mode="single"
          initialSelectedIds={[]}
          alreadyAddedIds={exerciseIds}
          excludeIds={picker.kind === 'swap' ? [picker.fromId] : undefined}
          preferMuscleGroup={
            picker.kind === 'swap'
              ? (catalogById.get(picker.fromId)?.muscleGroups[0] ?? null)
              : null
          }
          onConfirm={handlePickerConfirm}
        />
      </View>
    );
  }

  return (
    <View className="bg-bg flex-1">
      <LiveHeader
        title={routineName ?? t('workoutLive.header.title')}
        onFinish={handleFinish}
      />
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerClassName="gap-3 px-4"
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeExercises.length === 0 && (
          <Text
            className="text-label-secondary px-4 py-6 text-center"
            style={textStyles.callout}
          >
            {t('workoutLive.empty')}
          </Text>
        )}
        {supersetBlocks(activeExercises.map((e) => e.supersetGroup)).map(
          (block) => {
            if (block.group === null) {
              const exercise = activeExercises[block.start]!;
              return renderExercise(exercise);
            }
            const members = activeExercises.slice(block.start, block.end + 1);
            const memberIds = members.map((m) => m.exerciseId);
            const key = memberIds[0]!;
            const label = t(
              supersetKind(members.length) === 'circuit'
                ? 'workoutLive.superset.circuit'
                : 'workoutLive.superset.superset',
            );
            const { round, total } = supersetRound(
              members.map((m) => ({
                done: m.sets.filter((s) => s.completedAt !== null).length,
                total: m.sets.length,
              })),
            );
            return (
              <View
                key={`group-${key}`}
                className="flex-row gap-2"
                onLayout={(e) => rememberGroupY(key, e.nativeEvent.layout.y)}
              >
                <View
                  importantForAccessibility="no"
                  className="bg-bonus w-1 rounded-full"
                />
                <View className="flex-1 gap-2">
                  <View
                    accessible
                    accessibilityLabel={t('workoutLive.superset.a11y', {
                      label,
                      count: members.length,
                      round,
                      total,
                    })}
                    className="flex-row items-center justify-between px-1 pt-1"
                  >
                    <Text
                      maxFontSizeMultiplier={1.3}
                      className="text-bonus"
                      style={textStyles.overline}
                    >
                      {label}
                    </Text>
                    <Text
                      maxFontSizeMultiplier={1.3}
                      className="text-label-secondary"
                      style={textStyles.caption}
                    >
                      {t('workoutLive.superset.round', { round, total })}
                    </Text>
                  </View>
                  {members.map((exercise) =>
                    renderExercise(exercise, { key, memberIds }),
                  )}
                </View>
              </View>
            );
          },
        )}

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('workoutLive.addExerciseA11y')}
          onPress={() => {
            Keyboard.dismiss();
            setEditing(null);
            setPicker({ kind: 'add' });
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 52,
            borderRadius: 16,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: themeColor('border'),
          }}
        >
          <SymbolView name="plus" size={16} tintColor={themeColor('accent')} />
          <Text className="text-tint" style={textStyles.headline}>
            {t('workoutLive.addExercise')}
          </Text>
        </PressableScale>

        <Pressable
          accessibilityRole="button"
          onPress={() => confirmDiscard(false)}
          className="items-center py-4"
        >
          <Text className="text-destructive" style={textStyles.callout}>
            {t('workoutLive.discard.button')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
