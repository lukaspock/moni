import { useTranslation } from 'react-i18next';

import { ListRow } from '@/components/ui';

import type { WorkoutSummary } from './index';

/** One finished workout as a `ListRow` inside a `Card` list (Training tab + full history). */
export function WorkoutHistoryRow({
  workout,
  separator = false,
}: {
  workout: WorkoutSummary;
  separator?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const started = new Date(workout.startedAt);
  const durationMinutes = workout.endedAt
    ? Math.round(
        (new Date(workout.endedAt).getTime() - started.getTime()) / 60000,
      )
    : null;

  const parts: string[] = [];
  if (durationMinutes !== null) {
    parts.push(t('workout.history.duration', { minutes: durationMinutes }));
  }
  if (workout.kcalBurned !== null) {
    parts.push(
      t('workout.history.kcal', { kcal: Math.round(workout.kcalBurned) }),
    );
  }
  if (workout.isFromHealth) parts.push(t('health.badge'));

  return (
    <ListRow
      title={workout.routineName ?? t(`workout.category.${workout.category}`)}
      subtitle={parts.join(' · ')}
      symbol={workout.category === 'cardio' ? 'figure.run' : 'dumbbell.fill'}
      iconTone="bonus"
      value={started.toLocaleDateString(i18n.language, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })}
      separator={separator}
    />
  );
}
