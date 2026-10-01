import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import * as Haptics from 'expo-haptics';

import { Card, GlassActionButton } from '@/components/ui';
import {
  elapsedSeconds,
  exerciseDisplayName,
  finishActiveWorkout,
  getPreviousSetValues,
  openExercisePicker,
  useActiveWorkoutStore,
  useExerciseCatalog,
  useExercisePickerStore,
  useLatestWeightKg,
  type ActiveExercise,
  type ActiveSet,
  type TrackingType,
} from '@/features/workout';
import { useSession } from '@/features/auth';
import { useProfile } from '@/features/targets';
import { themeColor } from '@/theme/colors';

const DEFAULT_REST_SECONDS = 90;

function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

type SetField = 'weightKg' | 'reps' | 'durationS' | 'distanceM';

/** Which editable columns a tracking type shows, in display order. */
const FIELDS_BY_TRACKING: Record<
  TrackingType,
  { field: SetField; labelKey: LabelKey }[]
> = {
  weight_reps: [
    { field: 'weightKg', labelKey: 'workout.active.weightColumn' },
    { field: 'reps', labelKey: 'workout.active.reps' },
  ],
  reps: [{ field: 'reps', labelKey: 'workout.active.reps' }],
  duration: [{ field: 'durationS', labelKey: 'workout.active.duration' }],
  distance_duration: [
    { field: 'distanceM', labelKey: 'workout.active.distance' },
    { field: 'durationS', labelKey: 'workout.active.duration' },
  ],
};
type LabelKey =
  | 'workout.active.weightColumn'
  | 'workout.active.reps'
  | 'workout.active.duration'
  | 'workout.active.distance';

export default function ActiveWorkoutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { userId } = useSession();
  const { profile } = useProfile();
  const { weightKg } = useLatestWeightKg();
  const { exercises: catalog } = useExerciseCatalog();

  const workoutId = useActiveWorkoutStore((s) => s.workoutId);
  const startedAt = useActiveWorkoutStore((s) => s.startedAt);
  const activeExercises = useActiveWorkoutStore((s) => s.exercises);
  const restEndsAt = useActiveWorkoutStore((s) => s.restEndsAt);
  const addExercise = useActiveWorkoutStore((s) => s.addExercise);
  const clearRestTimer = useActiveWorkoutStore((s) => s.clearRestTimer);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = elapsedSeconds(startedAt, now);
  const restRemaining = restEndsAt
    ? Math.max(0, Math.ceil((restEndsAt - now) / 1000))
    : 0;
  useEffect(() => {
    if (restEndsAt && now >= restEndsAt) clearRestTimer();
  }, [restEndsAt, now, clearRestTimer]);

  const catalogById = useMemo(
    () => new Map(catalog.map((e) => [e.id, e])),
    [catalog],
  );

  const resultVersion = useExercisePickerStore((s) => s.resultVersion);
  const lastHandledVersion = useRef(resultVersion);
  useEffect(() => {
    if (resultVersion === lastHandledVersion.current) return;
    lastHandledVersion.current = resultVersion;
    const selectedIds = useExercisePickerStore.getState().selectedIds;
    for (const id of selectedIds) {
      const exercise = catalogById.get(id);
      if (!exercise) continue;
      if (activeExercises.some((e) => e.exerciseId === id)) continue;
      addExercise(id, exercise.trackingType, 3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultVersion]);

  function handleAddExercise() {
    openExercisePicker(
      'multi',
      activeExercises.map((e) => e.exerciseId),
    );
    router.push('/exercise-picker');
  }

  function handleCancel() {
    Alert.alert(
      t('workout.active.cancelConfirmTitle'),
      t('workout.active.cancelConfirmMessage'),
      [
        { text: t('workout.active.cancel'), style: 'cancel' },
        {
          text: t('workout.active.cancelWorkout'),
          style: 'destructive',
          onPress: () => {
            useActiveWorkoutStore.getState().reset();
            router.back();
          },
        },
      ],
    );
  }

  async function finish() {
    if (!userId) return;
    const result = finishActiveWorkout({
      userId,
      latestWeightKg: weightKg,
      eatBackFactor: profile?.eat_back_factor ?? 0.7,
      exerciseCatalog: catalog,
    });
    if (!result) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({
      pathname: '/workout/summary',
      params: {
        durationMinutes: String(Math.round(result.durationMinutes)),
        kcalBurned: String(result.kcalBurned),
        volumeKg: String(Math.round(result.volumeKg)),
        bonusKcal: String(result.workoutBonusKcal),
        prs: JSON.stringify(result.prs),
      },
    });
  }

  function handleFinish() {
    const anyDone = activeExercises.some((e) =>
      e.sets.some((s) => s.completedAt !== null),
    );
    if (anyDone) {
      void finish();
      return;
    }
    Alert.alert(
      t('workout.active.confirmFinishTitle'),
      t('workout.active.noSetsDone'),
      [
        { text: t('workout.active.cancel'), style: 'cancel' },
        { text: t('workout.active.finish'), onPress: () => void finish() },
      ],
    );
  }

  if (!workoutId) {
    // No active session (e.g. deep link / stale state) -> bounce back.
    router.back();
    return null;
  }

  return (
    <View className="bg-system-background flex-1">
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerClassName="gap-5 px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-label text-center text-lg font-semibold">
          {t('workout.active.title')}
        </Text>

        <Card className="items-center gap-1 py-6">
          <Text className="text-secondary-label text-xs font-semibold uppercase">
            {t('workout.active.elapsedLabel')}
          </Text>
          <Text
            className="text-label text-6xl font-bold"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatClock(elapsed)}
          </Text>
          {restRemaining > 0 && (
            <View className="bg-system-background mt-3 flex-row items-center gap-3 rounded-full py-2 pl-4 pr-2">
              <SymbolView
                name="timer"
                size={16}
                tintColor={themeColor('accent')}
              />
              <Text className="text-label text-base font-medium">
                {t('workout.active.restRemaining', { seconds: restRemaining })}
              </Text>
              <Pressable
                onPress={clearRestTimer}
                className="bg-secondary-system-background rounded-full px-3 py-1.5"
              >
                <Text className="text-tint text-sm font-medium">
                  {t('workout.active.skipRest')}
                </Text>
              </Pressable>
            </View>
          )}
        </Card>

        {activeExercises.length === 0 && (
          <Text className="text-secondary-label px-4 text-center text-sm">
            {t('workout.active.emptyExercises')}
          </Text>
        )}
        {activeExercises.map((exercise) => {
          const entry = catalogById.get(exercise.exerciseId);
          return (
            <ExerciseCard
              key={exercise.exerciseId}
              exercise={exercise}
              name={entry ? exerciseDisplayName(entry, t) : '…'}
            />
          );
        })}

        <Pressable
          onPress={handleAddExercise}
          className="bg-secondary-system-background flex-row items-center justify-center gap-2 rounded-2xl py-4"
        >
          <SymbolView
            name="plus.circle.fill"
            size={20}
            tintColor={themeColor('accent')}
          />
          <Text className="text-tint text-base font-semibold">
            {t('workout.active.addExercise')}
          </Text>
        </Pressable>

        <Pressable onPress={handleCancel} className="items-center py-3">
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

function ExerciseCard({
  exercise,
  name,
}: {
  exercise: ActiveExercise;
  name: string;
}) {
  const { t } = useTranslation();
  const addSet = useActiveWorkoutStore((s) => s.addSet);
  const removeExercise = useActiveWorkoutStore((s) => s.removeExercise);
  const previousValues = useMemo(
    () => getPreviousSetValues(exercise.exerciseId),
    [exercise.exerciseId],
  );
  const columns = FIELDS_BY_TRACKING[exercise.trackingType];

  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-label flex-1 text-lg font-semibold">{name}</Text>
        <Pressable
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
          <SymbolView name="ellipsis" size={20} tintColor="secondaryLabel" />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-2 px-1">
        <Text className="text-secondary-label w-10 text-center text-xs font-semibold uppercase">
          {t('workout.active.setColumn')}
        </Text>
        {columns.map((c) => (
          <Text
            key={c.field}
            className="text-secondary-label flex-1 text-center text-xs font-semibold uppercase"
          >
            {t(c.labelKey)}
          </Text>
        ))}
        <View className="w-11">
          <SymbolView
            name="checkmark"
            size={12}
            tintColor="secondaryLabel"
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
        />
      ))}

      <Pressable
        onPress={() => addSet(exercise.exerciseId)}
        className="bg-system-background flex-row items-center justify-center gap-2 rounded-xl py-3"
      >
        <SymbolView name="plus" size={14} tintColor={themeColor('accent')} />
        <Text className="text-tint text-sm font-semibold">
          {t('workout.active.addSet')}
        </Text>
      </Pressable>
    </Card>
  );
}

function SetRow({
  exerciseId,
  columns,
  set,
  index,
  previous,
}: {
  exerciseId: string;
  columns: { field: SetField; labelKey: LabelKey }[];
  set: ActiveSet;
  index: number;
  previous?: {
    reps: number | null;
    weightKg: number | null;
    durationS: number | null;
    distanceM: number | null;
  };
}) {
  const updateSet = useActiveWorkoutStore((s) => s.updateSet);
  const toggleSetCompleted = useActiveWorkoutStore((s) => s.toggleSetCompleted);
  const removeSet = useActiveWorkoutStore((s) => s.removeSet);
  const completed = set.completedAt !== null;

  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          onPress={() => removeSet(exerciseId, set.id)}
          className="bg-destructive ml-2 w-16 items-center justify-center rounded-xl"
        >
          <SymbolView name="trash" size={20} tintColor="white" />
        </Pressable>
      )}
    >
      <View
        className={`flex-row items-center gap-2 rounded-xl px-1 py-1 ${
          completed ? 'bg-tint/15' : ''
        }`}
      >
        <Text className="text-secondary-label w-10 text-center text-base font-semibold">
          {index + 1}
        </Text>
        {columns.map(({ field }) => {
          const value = set[field];
          const placeholder = previous?.[field];
          return (
            <TextInput
              key={field}
              value={value !== null ? String(value) : ''}
              onChangeText={(text) =>
                updateSet(exerciseId, set.id, {
                  [field]: text === '' ? null : Number(text.replace(',', '.')),
                })
              }
              placeholder={placeholder != null ? String(placeholder) : '-'}
              placeholderTextColor="gray"
              keyboardType="decimal-pad"
              selectTextOnFocus
              editable={!completed}
              className="bg-system-background text-label h-11 flex-1 rounded-xl text-center text-lg font-medium"
            />
          );
        })}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed }}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            toggleSetCompleted(exerciseId, set.id, DEFAULT_REST_SECONDS);
          }}
          className="h-11 w-11 items-center justify-center"
        >
          <SymbolView
            name={completed ? 'checkmark.circle.fill' : 'circle'}
            size={30}
            tintColor={completed ? themeColor('accent') : 'secondaryLabel'}
          />
        </Pressable>
      </View>
    </Swipeable>
  );
}
