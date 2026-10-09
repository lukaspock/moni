import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { fixedColors, themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

import {
  Card,
  GlassActionButton,
  IconTile,
  ListRow,
  ScreenTitle,
  SectionHeader,
} from '@/components/ui';
import { Reveal } from '@/components/motion';
import {
  useDeleteRoutine,
  useIsWorkoutActive,
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
  const { startEmpty, startFromRoutine, resumeWorkout } = useStartWorkout();
  const running = useIsWorkoutActive();

  function openRoutineMenu(routine: Routine) {
    Alert.alert(routine.name, undefined, [
      {
        text: t('workout.routine.edit'),
        onPress: () =>
          router.push({
            pathname: '/routine-editor',
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

  // Next routine in rotation: the one after the most recent routine workout.
  const lastRoutineName = history.find((w) => w.routineName)?.routineName;
  const lastIndex = routines.findIndex((r) => r.name === lastRoutineName);
  const nextRoutine: Routine | null =
    routines.length === 0 ? null : routines[(lastIndex + 1) % routines.length];

  const heroTitle = running
    ? t('workout.training.heroRunning')
    : nextRoutine
      ? nextRoutine.name
      : t('workout.training.heroEmpty');
  const heroEyebrow = running
    ? t('workout.training.heroRunningEyebrow')
    : todaysWorkouts.length > 0
      ? t('workout.training.doneToday')
      : nextRoutine
        ? t('workout.training.heroNext')
        : t('workout.training.heroEyebrow');

  return (
    <View className="bg-bg flex-1">
      <ScreenTitle title={t('training.title')} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-4 pb-32 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <Reveal index={0}>
          <View
            className="overflow-hidden"
            style={{ borderRadius: 32, borderCurve: 'continuous' }}
          >
            <LinearGradient
              colors={[fixedColors.ember, fixedColors.emberHot]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24, gap: 16 }}
            >
              <View className="gap-1">
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={{
                    ...textStyles.caption,
                    color: fixedColors.ink,
                    opacity: 0.75,
                    textTransform: 'uppercase',
                  }}
                >
                  {heroEyebrow}
                </Text>
                <Text
                  accessibilityRole="header"
                  maxFontSizeMultiplier={1.3}
                  style={{ ...textStyles.title, color: fixedColors.ink }}
                >
                  {heroTitle}
                </Text>
                {!running && nextRoutine && (
                  <Text
                    style={{
                      ...textStyles.callout,
                      color: fixedColors.ink,
                      opacity: 0.75,
                    }}
                  >
                    {t('workout.history.exercises', {
                      count: nextRoutine.exercises.length,
                    })}
                  </Text>
                )}
              </View>
              <GlassActionButton
                label={
                  running
                    ? t('workout.training.resume')
                    : t('workout.training.startWorkout')
                }
                symbol={
                  running ? 'play.fill' : 'figure.strengthtraining.traditional'
                }
                onPress={
                  running
                    ? resumeWorkout
                    : nextRoutine
                      ? () => startFromRoutine(nextRoutine)
                      : startEmpty
                }
              />
              {!running && nextRoutine && (
                <Text
                  accessibilityRole="button"
                  onPress={startEmpty}
                  style={{
                    ...textStyles.callout,
                    color: fixedColors.ink,
                    textAlign: 'center',
                    textDecorationLine: 'underline',
                  }}
                >
                  {t('workout.training.startEmpty')}
                </Text>
              )}
            </LinearGradient>
          </View>
        </Reveal>

        <Reveal index={1}>
          <View className="gap-2">
            <SectionHeader title={t('workout.training.routines')} />
            <Card className="gap-0 overflow-hidden p-0">
              {!routinesLoading && routines.length === 0 && (
                <Text className="text-label-secondary px-4 py-3 text-sm">
                  {t('workout.training.noRoutines')}
                </Text>
              )}
              {routines.map((routine) => (
                <ListRow
                  key={routine.id}
                  title={routine.name}
                  subtitle={t('workout.history.exercises', {
                    count: routine.exercises.length,
                  })}
                  symbol="dumbbell.fill"
                  iconTone="bonus"
                  separator
                  chevron={false}
                  onPress={() => startFromRoutine(routine)}
                  accessibilityLabel={`${routine.name}, ${t('workout.training.startFromRoutine')}`}
                  trailing={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('workout.routine.options')}
                      hitSlop={8}
                      onPress={() => openRoutineMenu(routine)}
                      className="px-2 py-2"
                    >
                      <SymbolView
                        name="ellipsis"
                        size={18}
                        tintColor={themeColor('labelSecondary')}
                      />
                    </Pressable>
                  }
                />
              ))}
              <ListRow
                title={t('workout.training.newRoutine')}
                leading={<IconTile symbol="plus" tone="accent" />}
                chevron={false}
                onPress={() => router.push('/routine-editor')}
              />
            </Card>
          </View>
        </Reveal>

        {visibleHistory.length > 0 && (
          <Reveal index={2}>
            <View className="gap-2">
              <SectionHeader title={t('workout.training.history')} />
              <Card className="gap-0 overflow-hidden p-0">
                {visibleHistory.map((workout, index) => (
                  <WorkoutHistoryRow
                    key={workout.id}
                    workout={workout}
                    separator={
                      index < visibleHistory.length - 1 ||
                      history.length > HISTORY_PREVIEW_COUNT
                    }
                  />
                ))}
                {history.length > HISTORY_PREVIEW_COUNT && (
                  <ListRow
                    title={t('workout.history.showAll')}
                    onPress={() => router.push('/(tabs)/training/history')}
                  />
                )}
              </Card>
            </View>
          </Reveal>
        )}
      </ScrollView>
    </View>
  );
}
