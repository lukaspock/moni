import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';

import { exerciseDisplayName, useExerciseCatalog, useExerciseProgress } from '@/features/workout';

/**
 * Simple per-exercise progress view (PLAN §7.4/§7.8): estimated 1RM per week
 * from `v_exercise_progress`, as a list + lightweight bar chart (kept
 * intentionally simple — a Skia chart can replace the bars later without
 * touching the data layer in `src/features/workout/progress.ts`).
 */
export default function ExerciseProgressScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercises } = useExerciseCatalog();
  const { points, isLoading } = useExerciseProgress(id ?? null);

  const exercise = exercises.find((e) => e.id === id);
  const maxOneRm = useMemo(() => Math.max(1, ...points.map((p) => p.estimated1RmKg)), [points]);

  return (
    <ScrollView className="flex-1 bg-system-background" contentContainerClassName="gap-4 p-4">
      {exercise && <Text className="text-lg font-semibold text-label">{exerciseDisplayName(exercise, t)}</Text>}
      <Text className="text-sm font-semibold uppercase text-secondary-label">{t('workout.progress.oneRepMax')}</Text>

      {!isLoading && points.length === 0 && <Text className="text-secondary-label">{t('workout.progress.empty')}</Text>}

      {points.map((point) => {
        const widthPct = Math.max(4, (point.estimated1RmKg / maxOneRm) * 100);
        return (
          <View key={point.weekStart} className="gap-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-secondary-label">{new Date(point.weekStart).toLocaleDateString()}</Text>
              <Text className="text-sm font-medium text-label">{Math.round(point.estimated1RmKg)} kg</Text>
            </View>
            <View className="h-3 overflow-hidden rounded-full bg-secondary-system-background">
              <View className="h-3 rounded-full bg-tint" style={{ width: `${widthPct}%` }} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
