import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Card, ListRow, Pill } from '@/components/ui';
import type { PlannedDay, WorkoutSummary } from '@/features/workout';

import { RestDayAction, type PlanSecondaryAction } from './RestDayAction';
import { textStyles } from '@/theme/typography';

function minutes(w: WorkoutSummary): number | null {
  if (!w.endedAt) return null;
  const ms = new Date(w.endedAt).getTime() - new Date(w.startedAt).getTime();
  return ms > 0 ? Math.max(1, Math.round(ms / 60_000)) : null;
}

/** Today's training: planned (ember accent), done, or rest day. Hidden for other days without data. */
export function TrainingCard({
  isToday,
  plannedDay,
  routineName = null,
  workouts,
  onStart,
  secondary = null,
}: {
  isToday: boolean;
  plannedDay: PlannedDay | null;
  /** Routine to start today (plan or rotation); falls back to `plannedDay.routineName`. */
  routineName?: string | null;
  workouts: WorkoutSummary[];
  onStart: () => void;
  /** Quiet plan action under the row ("Heute nicht" / "Doch trainieren" / "Rückgängig"). */
  secondary?: PlanSecondaryAction | null;
}) {
  const { t } = useTranslation();
  const done = workouts.filter((w) => w.endedAt);

  if (done.length > 0) {
    return (
      <Card variant="tinted" tone="bonus" className="gap-0 overflow-hidden p-0">
        {done.map((w, i) => {
          const min = minutes(w);
          const parts = [
            w.routineName,
            min ? t('identity.today.minutes', { count: min }) : null,
          ].filter(Boolean);
          return (
            <ListRow
              key={w.id}
              symbol="checkmark.circle.fill"
              iconTone="bonus"
              title={t('food.dashboard.trainingDone')}
              subtitle={parts.join(' · ') || undefined}
              value={
                w.kcalBurned ? String(Math.round(w.kcalBurned)) : undefined
              }
              unit={w.kcalBurned ? t('food.dashboard.kcalUnit') : undefined}
              separator={i < done.length - 1}
            />
          );
        })}
      </Card>
    );
  }
  if (!isToday) return null;
  if (plannedDay) {
    return (
      <Card variant="tinted" tone="bonus" className="gap-0 overflow-hidden p-0">
        <ListRow
          symbol="bolt.fill"
          iconTone="bonus"
          title={t('food.dashboard.trainingCardTitle')}
          subtitle={
            plannedDay.routineName ??
            routineName ??
            t('food.dashboard.trainingPlannedFreeform')
          }
          trailing={
            <Pill tone="bonus" label={t('food.dashboard.startWorkout')} />
          }
          onPress={onStart}
          accessibilityLabel={`${t('food.dashboard.trainingCardTitle')}, ${t('food.dashboard.startWorkout')}`}
        />
        {secondary ? (
          <Pressable
            onPress={secondary.onPress}
            accessibilityRole="button"
            accessibilityLabel={secondary.label}
            className="h-11 justify-center px-4"
            style={{ paddingLeft: 68 }}
          >
            <Text className="text-label-secondary" style={textStyles.button}>
              {secondary.label}
            </Text>
          </Pressable>
        ) : null}
      </Card>
    );
  }
  return (
    <View>
      <RestDayAction secondary={secondary} />
    </View>
  );
}
