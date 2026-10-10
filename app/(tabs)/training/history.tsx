import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, ListRow } from '@/components/ui';
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
      className="bg-bg flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-4 px-4 pb-12 pt-4"
    >
      {workouts.length === 0 && !isLoading ? (
        <Text className="text-label-secondary mt-8 text-center">
          {t('workout.history.empty')}
        </Text>
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          {workouts.map((workout, index) => (
            <WorkoutHistoryRow
              key={workout.id}
              workout={workout}
              separator={index < workouts.length - 1 || hasMore}
            />
          ))}
          {hasMore && (
            <ListRow
              title={t('workout.history.loadMore')}
              chevron={false}
              onPress={() => {
                if (!isLoading) setLimit((l) => l + PAGE_SIZE);
              }}
            />
          )}
        </Card>
      )}
    </ScrollView>
  );
}
