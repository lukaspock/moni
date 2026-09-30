import { FlatList, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useWorkoutHistory, type WorkoutSummary } from '@/features/workout';

export default function TrainingHistoryScreen() {
  const { t } = useTranslation();
  const { workouts, isLoading } = useWorkoutHistory(100);

  return (
    <FlatList
      className="bg-system-background flex-1"
      contentContainerClassName="gap-2 p-4"
      data={workouts}
      keyExtractor={(w) => w.id}
      ListEmptyComponent={
        !isLoading ? (
          <Text className="text-secondary-label mt-8 text-center">
            {t('workout.history.empty')}
          </Text>
        ) : null
      }
      renderItem={({ item }) => <HistoryRow workout={item} />}
    />
  );
}

function HistoryRow({ workout }: { workout: WorkoutSummary }) {
  const { t } = useTranslation();
  const started = new Date(workout.startedAt);
  const durationMinutes = workout.endedAt
    ? Math.round(
        (new Date(workout.endedAt).getTime() - started.getTime()) / 60000,
      )
    : null;

  return (
    <View className="bg-secondary-system-background rounded-xl px-4 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-label text-base font-medium">
          {workout.routineName ?? t(`workout.category.${workout.category}`)}
        </Text>
        <Text className="text-secondary-label text-xs">
          {started.toLocaleDateString()}{' '}
          {started.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      <View className="mt-1 flex-row gap-3">
        {durationMinutes !== null && (
          <Text className="text-secondary-label text-xs">
            {t('workout.history.duration', { minutes: durationMinutes })}
          </Text>
        )}
        {workout.kcalBurned !== null && (
          <Text className="text-secondary-label text-xs">
            {t('workout.history.kcal', { kcal: workout.kcalBurned })}
          </Text>
        )}
        {workout.isFromHealth ? (
          <Text className="text-tint text-xs font-medium">
            {t('health.badge')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
