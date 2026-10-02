import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { themeColor } from '@/theme/colors';

import {
  Card,
  GlassActionButton,
  ScreenTitle,
  SectionHeader,
} from '@/components/ui';
import {
  useDeleteRoutine,
  useRoutines,
  useStartWorkout,
  useWorkoutHistory,
  useWorkoutsForDate,
  type Routine,
} from '@/features/workout';
import { WorkoutHistoryRow } from '@/features/workout/WorkoutHistoryRow';
import { toISODate } from '@/lib/date';

const HISTORY_PREVIEW_COUNT = 5;

export default function TrainingScreen() {
  const { t } = useTranslation();
  const { workouts: todaysWorkouts } = useWorkoutsForDate(toISODate());
  const { routines, isLoading: routinesLoading } = useRoutines();
  const { workouts: history } = useWorkoutHistory(HISTORY_PREVIEW_COUNT + 1);
  const deleteRoutine = useDeleteRoutine();
  const { startEmpty, startFromRoutine } = useStartWorkout();

  function openRoutineMenu(routine: Routine) {
    Alert.alert(routine.name, undefined, [
      {
        text: t('workout.routine.edit'),
        onPress: () =>
          router.push({
            pathname: '/(tabs)/training/routine-editor',
            params: { id: routine.id },
          }),
      },
      {
        text: t('workout.routine.delete'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            t('workout.routine.deleteConfirmTitle'),
            t('workout.routine.deleteConfirmMessage'),
            [
              { text: t('workout.active.cancel'), style: 'cancel' },
              {
                text: t('workout.routine.delete'),
                style: 'destructive',
                onPress: () => deleteRoutine(routine.id),
              },
            ],
          ),
      },
      { text: t('workout.active.cancel'), style: 'cancel' },
    ]);
  }

  const visibleHistory = history.slice(0, HISTORY_PREVIEW_COUNT);

  return (
    <View className="bg-system-background flex-1">
      <ScreenTitle title={t('training.title')} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-4 pb-32 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <Text className="text-secondary-label text-center text-sm">
            {todaysWorkouts.length > 0
              ? t('workout.training.doneToday')
              : t('workout.training.startHint')}
          </Text>
          <GlassActionButton
            label={t('workout.training.startWorkout')}
            symbol="figure.strengthtraining.traditional"
            onPress={startEmpty}
          />
        </Card>

        <View className="gap-2">
          <SectionHeader title={t('workout.training.routines')} />
          <Card className="gap-0 overflow-hidden p-0">
            {!routinesLoading && routines.length === 0 && (
              <Text className="text-secondary-label px-4 py-3 text-sm">
                {t('workout.training.noRoutines')}
              </Text>
            )}
            {routines.map((routine, index) => (
              <View key={routine.id}>
                {index > 0 && <View className="bg-separator h-px" />}
                <View className="flex-row items-center">
                  <Pressable
                    className="flex-1 px-4 py-3"
                    onPress={() => startFromRoutine(routine)}
                  >
                    <Text className="text-label text-base font-medium">
                      {routine.name}
                    </Text>
                    <Text className="text-secondary-label text-xs">
                      {t('workout.history.exercises', {
                        count: routine.exercises.length,
                      })}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={t('workout.routine.options')}
                    hitSlop={8}
                    className="px-4 py-3"
                    onPress={() => openRoutineMenu(routine)}
                  >
                    <SymbolView
                      name="ellipsis"
                      size={18}
                      tintColor="secondaryLabel"
                    />
                  </Pressable>
                </View>
              </View>
            ))}
            {(routines.length > 0 || !routinesLoading) && (
              <View className="bg-separator h-px" />
            )}
            <Pressable
              onPress={() => router.push('/(tabs)/training/routine-editor')}
              className="flex-row items-center gap-2 px-4 py-3"
            >
              <SymbolView
                name="plus.circle.fill"
                size={20}
                tintColor={themeColor('accent')}
              />
              <Text className="text-tint text-base font-medium">
                {t('workout.training.newRoutine')}
              </Text>
            </Pressable>
          </Card>
        </View>

        {visibleHistory.length > 0 && (
          <View className="gap-2">
            <SectionHeader title={t('workout.training.history')} />
            <Card className="gap-0 overflow-hidden p-0">
              {visibleHistory.map((workout, index) => (
                <View key={workout.id}>
                  {index > 0 && <View className="bg-separator h-px" />}
                  <WorkoutHistoryRow workout={workout} />
                </View>
              ))}
              {history.length > HISTORY_PREVIEW_COUNT && (
                <>
                  <View className="bg-separator h-px" />
                  <Pressable
                    onPress={() => router.push('/(tabs)/training/history')}
                    className="flex-row items-center justify-between px-4 py-3"
                  >
                    <Text className="text-tint text-base">
                      {t('workout.history.showAll')}
                    </Text>
                    <SymbolView
                      name="chevron.right"
                      size={14}
                      tintColor="secondaryLabel"
                    />
                  </Pressable>
                </>
              )}
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
