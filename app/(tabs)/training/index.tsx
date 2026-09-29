import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { themeColor } from '@/theme/colors';

import {
  estimateExpectedKcalForRoutine,
  useDeleteRoutine,
  useExerciseCatalog,
  useLatestWeightKg,
  useRoutines,
  useSaveWeekdayPlan,
  useWorkoutsForDate,
  usePlannedDaysWithRoutineNames,
  useActiveWorkoutStore,
  type Routine,
} from '@/features/workout';
import { usePlannedDay } from '@/features/workout';
import { toISODate, weekdayOf } from '@/lib/date';

const WEEKDAY_KEYS = [
  'workout.weekday.0',
  'workout.weekday.1',
  'workout.weekday.2',
  'workout.weekday.3',
  'workout.weekday.4',
  'workout.weekday.5',
  'workout.weekday.6',
] as const;

const WEEKDAY_SHORT_KEYS = [
  'workout.weekdayShort.0',
  'workout.weekdayShort.1',
  'workout.weekdayShort.2',
  'workout.weekdayShort.3',
  'workout.weekdayShort.4',
  'workout.weekdayShort.5',
  'workout.weekdayShort.6',
] as const;

export default function TrainingScreen() {
  const { t } = useTranslation();
  const today = toISODate();
  const { plannedDay, isLoading: planLoading } = usePlannedDay(today);
  const { workouts: todaysWorkouts } = useWorkoutsForDate(today);
  const { routines, isLoading: routinesLoading, refresh: refreshRoutines } = useRoutines();
  const deleteRoutine = useDeleteRoutine();
  const startWorkout = useActiveWorkoutStore((s) => s.startWorkout);
  const addExercise = useActiveWorkoutStore((s) => s.addExercise);
  const { exercises: catalog } = useExerciseCatalog();

  const alreadyDidWorkoutToday = todaysWorkouts.length > 0;

  function startFromRoutine(routine: Routine) {
    startWorkout({ routineId: routine.id, category: 'strength' });
    for (const re of routine.exercises) {
      const exercise = catalog.find((e) => e.id === re.exerciseId);
      addExercise(re.exerciseId, exercise?.trackingType ?? 'weight_reps', re.targetSets ?? 3);
    }
    router.push('/workout/active');
  }

  function startEmpty() {
    startWorkout({ routineId: null, category: 'strength' });
    router.push('/workout/active');
  }

  return (
    <ScrollView className="flex-1 bg-system-background" contentContainerClassName="gap-6 px-4 pb-12 pt-2">
      <TodayCard
        plannedRoutineName={plannedDay?.routineName ?? null}
        isRestDay={!planLoading && plannedDay === null}
        alreadyDidWorkoutToday={alreadyDidWorkoutToday}
        expectedKcal={plannedDay?.expectedKcal ?? null}
        onStartEmpty={startEmpty}
        onStartFromPlannedRoutine={() => {
          if (!plannedDay?.routineId) return;
          const routine = routines.find((r) => r.id === plannedDay.routineId);
          if (routine) startFromRoutine(routine);
        }}
      />

      <Section title={t('workout.training.logCardio')} icon="figure.run">
        <Pressable
          onPress={() => router.push('/(tabs)/training/cardio-entry')}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-secondary-system-background py-3"
        >
          <SymbolView name="plus" size={16} />
          <Text className="text-base text-label">{t('workout.training.logCardio')}</Text>
        </Pressable>
      </Section>

      <WeeklyPlanSection />

      <Section title={t('workout.training.routines')} icon="list.bullet">
        {!routinesLoading && routines.length === 0 && (
          <Text className="mb-2 text-sm text-secondary-label">{t('workout.training.noRoutines')}</Text>
        )}
        {routines.map((routine) => (
          <View key={routine.id} className="mb-2 flex-row items-center justify-between rounded-xl bg-secondary-system-background px-4 py-3">
            <Pressable className="flex-1" onPress={() => startFromRoutine(routine)}>
              <Text className="text-base font-medium text-label">{routine.name}</Text>
              <Text className="text-xs text-secondary-label">{routine.exercises.length} {t('workout.routine.exercises').toLowerCase()}</Text>
            </Pressable>
            <Pressable
              className="px-2"
              onPress={() => router.push({ pathname: '/(tabs)/training/routine-editor', params: { id: routine.id } })}
            >
              <SymbolView name="pencil" size={18} tintColor="secondaryLabel" />
            </Pressable>
            <Pressable
              className="px-2"
              onPress={() =>
                Alert.alert(t('workout.routine.deleteConfirmTitle'), t('workout.routine.deleteConfirmMessage'), [
                  { text: t('workout.active.cancel'), style: 'cancel' },
                  {
                    text: t('workout.routine.delete'),
                    style: 'destructive',
                    onPress: () => {
                      deleteRoutine(routine.id);
                      refreshRoutines();
                    },
                  },
                ])
              }
            >
              <SymbolView name="trash" size={18} tintColor={themeColor('danger')} />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={() => router.push('/(tabs)/training/routine-editor')}
          className="mt-1 flex-row items-center justify-center gap-2 rounded-xl bg-tint py-3"
        >
          <SymbolView name="plus" size={16} tintColor="white" />
          <Text className="text-base font-semibold text-white">{t('workout.training.newRoutine')}</Text>
        </Pressable>
      </Section>

      <Section title={t('workout.training.history')} icon="clock">
        <Pressable
          onPress={() => router.push('/(tabs)/training/history')}
          className="flex-row items-center justify-between rounded-xl bg-secondary-system-background px-4 py-3"
        >
          <Text className="text-base text-label">{t('workout.history.title')}</Text>
          <SymbolView name="chevron.right" size={14} tintColor="secondaryLabel" />
        </Pressable>
      </Section>
    </ScrollView>
  );
}

function TodayCard({
  plannedRoutineName,
  isRestDay,
  alreadyDidWorkoutToday,
  expectedKcal,
  onStartEmpty,
  onStartFromPlannedRoutine,
}: {
  plannedRoutineName: string | null;
  isRestDay: boolean;
  alreadyDidWorkoutToday: boolean;
  expectedKcal: number | null;
  onStartEmpty: () => void;
  onStartFromPlannedRoutine: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="rounded-2xl bg-secondary-system-background p-5">
      <Text className="mb-1 text-sm text-secondary-label">
        {isRestDay ? t('workout.training.restDay') : (plannedRoutineName ?? t('workout.training.freeTraining'))}
      </Text>
      {expectedKcal !== null && expectedKcal > 0 && (
        <Text className="mb-3 text-xs text-secondary-label">{t('workout.training.expectedKcal', { kcal: expectedKcal })}</Text>
      )}
      {alreadyDidWorkoutToday && <Text className="mb-3 text-sm text-tint">✓ {t('workout.history.title')}</Text>}
      <View className="flex-row gap-2">
        {plannedRoutineName && (
          <Pressable onPress={onStartFromPlannedRoutine} className="flex-1 items-center rounded-xl bg-tint py-3">
            <Text className="text-base font-semibold text-white">{t('workout.training.startFromRoutine')}</Text>
          </Pressable>
        )}
        <Pressable onPress={onStartEmpty} className="flex-1 items-center rounded-xl bg-system-background py-3">
          <Text className="text-base font-semibold text-label">{t('workout.training.startEmpty')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function WeeklyPlanSection() {
  const { t } = useTranslation();
  const { days, isLoading } = usePlannedDaysWithRoutineNames();
  const { routines } = useRoutines();
  const { weightKg } = useLatestWeightKg();
  const saveWeekdayPlan = useSaveWeekdayPlan();
  const [editingWeekday, setEditingWeekday] = useState<number | null>(null);
  const todayWeekday = weekdayOf(toISODate());

  return (
    <Section title={t('workout.training.weeklyPlan')} icon="calendar">
      {!isLoading &&
        days.map((day) => (
          <Pressable
            key={day.weekday}
            onPress={() => setEditingWeekday(day.weekday)}
            className={`mb-2 flex-row items-center justify-between rounded-xl px-4 py-3 ${
              day.weekday === todayWeekday ? 'bg-tint/10' : 'bg-secondary-system-background'
            }`}
          >
            <Text className="w-10 text-sm font-medium text-label">{t(WEEKDAY_SHORT_KEYS[day.weekday])}</Text>
            <Text className="flex-1 text-sm text-label">{day.routineName ?? t('workout.training.restDay')}</Text>
            {day.expectedKcal ? (
              <Text className="text-xs text-secondary-label">{t('workout.plan.estimatedKcal', { kcal: day.expectedKcal })}</Text>
            ) : null}
          </Pressable>
        ))}

      {editingWeekday !== null && (
        <View className="mt-2 gap-2 rounded-xl bg-secondary-system-background p-3">
          <Text className="mb-1 text-sm font-medium text-label">{t(WEEKDAY_KEYS[editingWeekday])}</Text>
          <Pressable
            onPress={async () => {
              await saveWeekdayPlan(editingWeekday, null, null);
              setEditingWeekday(null);
            }}
            className="rounded-lg bg-system-background px-3 py-2"
          >
            <Text className="text-label">{t('workout.plan.rest')}</Text>
          </Pressable>
          {routines.map((routine) => (
            <Pressable
              key={routine.id}
              onPress={async () => {
                const totalSets = routine.exercises.reduce((sum, e) => sum + (e.targetSets ?? 0), 0);
                const expectedKcal = totalSets > 0 ? estimateExpectedKcalForRoutine(totalSets, weightKg) : null;
                await saveWeekdayPlan(editingWeekday, routine.id, expectedKcal);
                setEditingWeekday(null);
              }}
              className="rounded-lg bg-system-background px-3 py-2"
            >
              <Text className="text-label">{routine.name}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setEditingWeekday(null)} className="items-center py-1">
            <Text className="text-sm text-secondary-label">{t('common.cancel')}</Text>
          </Pressable>
        </View>
      )}
    </Section>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View>
      <View className="mb-2 flex-row items-center gap-2">
        <SymbolView name={icon as never} size={16} tintColor="secondaryLabel" />
        <Text className="text-sm font-semibold uppercase text-secondary-label">{title}</Text>
      </View>
      {children}
    </View>
  );
}
