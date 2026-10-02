import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui';
import { WorkoutHistoryRow } from '@/features/workout/WorkoutHistoryRow';
import { useWorkoutHistory } from '@/features/workout';

const PAGE_SIZE = 30;

export default function TrainingHistoryScreen() {
  const { t } = useTranslation();
  // Pagination: the list grows by one page per tap (the hook reads `limit` rows, newest first).
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { workouts, isLoading, hasMore } = useWorkoutHistory(limit);

  return (
    <ScrollView
      className="bg-system-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-4 px-4 pb-12 pt-4"
    >
      {workouts.length === 0 && !isLoading ? (
        <Text className="text-secondary-label mt-8 text-center">
          {t('workout.history.empty')}
        </Text>
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          {workouts.map((workout, index) => (
            <View key={workout.id}>
              {index > 0 && <View className="bg-separator h-px" />}
              <WorkoutHistoryRow workout={workout} />
            </View>
          ))}
          {hasMore && (
            <>
              <View className="bg-separator h-px" />
              <Pressable
                disabled={isLoading}
                onPress={() => setLimit((l) => l + PAGE_SIZE)}
                className="px-4 py-3"
              >
                <Text className="text-tint text-center text-base">
                  {t('workout.history.loadMore')}
                </Text>
              </Pressable>
            </>
          )}
        </Card>
      )}
    </ScrollView>
  );
}
