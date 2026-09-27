import { FlatList, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useWorkoutHistory, type WorkoutSummary } from '@/features/workout';

export default function TrainingHistoryScreen() {
  const { t } = useTranslation();
  const { workouts, isLoading } = useWorkoutHistory(100);

  return (
    <FlatList
      className="flex-1 bg-system-background"
      contentContainerClassName="gap-2 p-4"
      data={workouts}
      keyExtractor={(w) => w.id}
      ListEmptyComponent={
        !isLoading ? <Text className="mt-8 text-center text-secondary-label">{t('workout.history.empty')}</Text> : null
      }
      renderItem={({ item }) => <HistoryRow workout={item} />}
    />
  );
}

function HistoryRow({ workout }: { workout: WorkoutSummary }) {
  const { t } = useTranslation();
  const started = new Date(workout.startedAt);
  const durationMinutes =
    workout.endedAt ? Math.round((new Date(workout.endedAt).getTime() - started.getTime()) / 60000) : null;

  return (
    <View className="rounded-xl bg-secondary-system-background px-4 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-medium text-label">
          {workout.routineName ?? t(`workout.category.${workout.category}`)}
        </Text>
        <Text className="text-xs text-secondary-label">
          {started.toLocaleDateString()} {started.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <View className="mt-1 flex-row gap-3">
        {durationMinutes !== null && (
          <Text className="text-xs text-secondary-label">{t('workout.history.duration', { minutes: durationMinutes })}</Text>
        )}
        {workout.kcalBurned !== null && (
          <Text className="text-xs text-secondary-label">{t('workout.history.kcal', { kcal: workout.kcalBurned })}</Text>
        )}
      </View>
    </View>
  );
}
