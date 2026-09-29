import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { themeColor } from '@/theme/colors';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';

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

const DEFAULT_REST_SECONDS = 90;

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ActiveWorkoutScreen() {
  const { t } = useTranslation();
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
  const restRemaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;
  useEffect(() => {
    if (restEndsAt && now >= restEndsAt) clearRestTimer();
  }, [restEndsAt, now, clearRestTimer]);

  const catalogById = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);

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
    Alert.alert(t('workout.active.cancelConfirmTitle'), t('workout.active.cancelConfirmMessage'), [
      { text: t('workout.active.cancel'), style: 'cancel' },
      {
        text: t('workout.active.cancelConfirmTitle'),
        style: 'destructive',
        onPress: () => {
          useActiveWorkoutStore.getState().reset();
          router.back();
        },
      },
    ]);
  }

  async function handleFinish() {
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

  if (!workoutId) {
    // No active session (e.g. deep link / stale state) -> bounce back.
    router.back();
    return null;
  }

  return (
    <View className="flex-1 bg-system-background">
      <View className="flex-row items-center justify-between px-4 pb-2 pt-14">
        <Pressable onPress={handleCancel}>
          <Text className="text-base text-destructive">{t('workout.active.cancel')}</Text>
        </Pressable>
        <Text className="text-base font-semibold text-label">{formatClock(elapsed)}</Text>
        <View style={{ width: 60 }} />
      </View>

      {restRemaining > 0 && (
        <View className="mx-4 mb-2 flex-row items-center justify-between rounded-xl bg-secondary-system-background px-4 py-2">
          <Text className="text-base text-label">{t('workout.active.restRemaining', { seconds: restRemaining })}</Text>
          <Pressable onPress={clearRestTimer}>
            <Text className="text-sm text-tint">{t('workout.active.skipRest')}</Text>
          </Pressable>
        </View>
      )}

      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-4 pb-32">
        {activeExercises.length === 0 && (
          <Text className="mt-8 text-center text-secondary-label">{t('workout.active.emptyExercises')}</Text>
        )}
        {activeExercises.map((exercise) => (
          <ExerciseCard
            key={exercise.exerciseId}
            exercise={exercise}
            name={catalogById.get(exercise.exerciseId) ? exerciseDisplayName(catalogById.get(exercise.exerciseId)!, t) : '…'}
          />
        ))}

        <Pressable onPress={handleAddExercise} className="flex-row items-center justify-center gap-2 rounded-xl bg-secondary-system-background py-3">
          <SymbolView name="plus" size={18} />
          <Text className="text-base font-medium text-label">{t('workout.active.addExercise')}</Text>
        </Pressable>
      </ScrollView>

      <GlassView glassEffectStyle="regular" isInteractive className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between px-6 py-4 pb-8">
        <Text className="text-base text-secondary-label">{formatClock(elapsed)}</Text>
        <Pressable onPress={handleFinish} className="rounded-full bg-tint px-6 py-2.5">
          <Text className="text-base font-semibold text-white">{t('workout.active.finish')}</Text>
        </Pressable>
      </GlassView>
    </View>
  );
}

function ExerciseCard({ exercise, name }: { exercise: ActiveExercise; name: string }) {
  const { t } = useTranslation();
  const addSet = useActiveWorkoutStore((s) => s.addSet);
  const removeExercise = useActiveWorkoutStore((s) => s.removeExercise);
  const previousValues = useMemo(() => getPreviousSetValues(exercise.exerciseId), [exercise.exerciseId]);

  return (
    <View className="rounded-2xl bg-secondary-system-background p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-label">{name}</Text>
        <Pressable onPress={() => removeExercise(exercise.exerciseId)}>
          <SymbolView name="xmark.circle" size={18} tintColor="secondaryLabel" />
        </Pressable>
      </View>

      {exercise.sets.map((set, index) => (
        <SetRow
          key={set.id}
          exerciseId={exercise.exerciseId}
          trackingType={exercise.trackingType}
          set={set}
          index={index}
          previous={previousValues[index]}
        />
      ))}

      <Pressable onPress={() => addSet(exercise.exerciseId)} className="mt-2 flex-row items-center gap-1">
        <SymbolView name="plus" size={14} tintColor="secondaryLabel" />
        <Text className="text-sm text-secondary-label">{t('workout.active.addSet')}</Text>
      </Pressable>
    </View>
  );
}

function SetRow({
  exerciseId,
  trackingType,
  set,
  index,
  previous,
}: {
  exerciseId: string;
  trackingType: TrackingType;
  set: ActiveSet;
  index: number;
  previous?: { reps: number | null; weightKg: number | null; durationS: number | null; distanceM: number | null };
}) {
  const { t } = useTranslation();
  const updateSet = useActiveWorkoutStore((s) => s.updateSet);
  const toggleSetCompleted = useActiveWorkoutStore((s) => s.toggleSetCompleted);
  const removeSet = useActiveWorkoutStore((s) => s.removeSet);
  const completed = set.completedAt !== null;

  function numField(
    label: string,
    value: number | null,
    placeholder: number | null | undefined,
    onChange: (v: number | null) => void,
  ) {
    return (
      <View className="flex-1">
        <Text className="mb-0.5 text-[10px] text-secondary-label">{label}</Text>
        <TextInput
          value={value !== null ? String(value) : ''}
          onChangeText={(text) => onChange(text === '' ? null : Number(text.replace(',', '.')))}
          placeholder={placeholder != null ? String(placeholder) : '-'}
          placeholderTextColor="gray"
          keyboardType="decimal-pad"
          editable={!completed}
          className="rounded-lg bg-system-background px-2 py-1.5 text-center text-base text-label"
        />
      </View>
    );
  }

  return (
    <View className="mb-2 flex-row items-center gap-2">
      <Text className="w-6 text-xs text-secondary-label">{index + 1}</Text>

      {trackingType === 'weight_reps' && (
        <>
          {numField(t('workout.active.reps'), set.reps, previous?.reps, (v) => updateSet(exerciseId, set.id, { reps: v }))}
          {numField(t('workout.active.weight'), set.weightKg, previous?.weightKg, (v) =>
            updateSet(exerciseId, set.id, { weightKg: v }),
          )}
        </>
      )}
      {trackingType === 'reps' &&
        numField(t('workout.active.reps'), set.reps, previous?.reps, (v) => updateSet(exerciseId, set.id, { reps: v }))}
      {trackingType === 'duration' &&
        numField(t('workout.active.duration'), set.durationS, previous?.durationS, (v) =>
          updateSet(exerciseId, set.id, { durationS: v }),
        )}
      {trackingType === 'distance_duration' && (
        <>
          {numField(t('workout.active.distance'), set.distanceM, previous?.distanceM, (v) =>
            updateSet(exerciseId, set.id, { distanceM: v }),
          )}
          {numField(t('workout.active.duration'), set.durationS, previous?.durationS, (v) =>
            updateSet(exerciseId, set.id, { durationS: v }),
          )}
        </>
      )}

      <Pressable
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          toggleSetCompleted(exerciseId, set.id, DEFAULT_REST_SECONDS);
        }}
      >
        <SymbolView
          name={completed ? 'checkmark.circle.fill' : 'circle'}
          size={26}
          tintColor={completed ? themeColor('accent') : 'secondaryLabel'}
        />
      </Pressable>
      <Pressable onPress={() => removeSet(exerciseId, set.id)}>
        <SymbolView name="minus.circle" size={18} tintColor="secondaryLabel" />
      </Pressable>
    </View>
  );
}
