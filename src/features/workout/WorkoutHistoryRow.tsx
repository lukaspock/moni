import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { WorkoutSummary } from './index';

/** One finished workout as a row inside a `Card` list (Training tab + full history). */
export function WorkoutHistoryRow({ workout }: { workout: WorkoutSummary }) {
  const { t, i18n } = useTranslation();
  const started = new Date(workout.startedAt);
  const durationMinutes = workout.endedAt
    ? Math.round(
        (new Date(workout.endedAt).getTime() - started.getTime()) / 60000,
      )
    : null;

  return (
    <View className="gap-0.5 px-4 py-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-label flex-1 text-base font-medium">
          {workout.routineName ?? t(`workout.category.${workout.category}`)}
        </Text>
        <Text className="text-secondary-label text-xs">
          {started.toLocaleDateString(i18n.language, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
        </Text>
      </View>
      <View className="flex-row gap-3">
        {durationMinutes !== null && (
          <Text className="text-secondary-label text-xs">
            {t('workout.history.duration', { minutes: durationMinutes })}
          </Text>
        )}
        {workout.kcalBurned !== null && (
          <Text className="text-secondary-label text-xs">
            {t('workout.history.kcal', {
              kcal: Math.round(workout.kcalBurned),
            })}
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
