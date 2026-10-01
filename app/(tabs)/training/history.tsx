import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui';
import { WorkoutHistoryRow } from '@/features/workout/WorkoutHistoryRow';
import { useWorkoutHistory } from '@/features/workout';

export default function TrainingHistoryScreen() {
  const { t } = useTranslation();
  const { workouts, isLoading } = useWorkoutHistory(100);

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
        </Card>
      )}
    </ScrollView>
  );
}
