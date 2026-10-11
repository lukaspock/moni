import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { PlanRangeDay } from '@/domain/trainingCycle';
import { textStyles } from '@/theme/typography';

function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

/**
 * Compact plan strip: one cell per day (weekday, date, a small mark and the
 * routine name), seven per row. Today is tinted. Purely presentational — the
 * plan comes from `effectivePlanRange` / `useUpcomingPlan`.
 */
export function PlanStrip({
  days,
  today,
  routineLabel,
}: {
  days: readonly PlanRangeDay[];
  today: string;
  /** Display name for a training day's routine id (null = rotation). */
  routineLabel: (routineId: string | null) => string;
}) {
  const { t, i18n } = useTranslation();
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
  const dayNum = new Intl.DateTimeFormat(i18n.language, { day: 'numeric' });
  const longDay = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View className="gap-3">
      {chunk(days, 7).map((row) => (
        <View key={row[0]!.date} className="flex-row gap-1">
          {row.map((d) => {
            const isToday = d.date === today;
            const training = d.day.kind === 'training';
            const label = training
              ? routineLabel(d.day.kind === 'training' ? d.day.routineId : null)
              : t('trainingPlan.rest');
            const date = localDate(d.date);
            return (
              <View
                key={d.date}
                accessible
                accessibilityLabel={t('trainingPlan.week.a11yDay', {
                  day: longDay.format(date),
                  plan: label,
                })}
                className={`flex-1 items-center gap-1 rounded-inner py-2 ${
                  isToday ? 'bg-tint-soft' : ''
                }`}
                style={{ borderCurve: 'continuous' }}
              >
                <Text
                  maxFontSizeMultiplier={1.2}
                  className={isToday ? 'text-tint' : 'text-label-secondary'}
                  style={textStyles.caption}
                >
                  {weekday.format(date)}
                </Text>
                <Text
                  maxFontSizeMultiplier={1.2}
                  className="text-label"
                  style={textStyles.callout}
                >
                  {dayNum.format(date)}
                </Text>
                <View
                  className={`h-1.5 w-1.5 rounded-full ${
                    training ? 'bg-bonus' : 'bg-line'
                  }`}
                />
                <Text
                  maxFontSizeMultiplier={1.1}
                  numberOfLines={1}
                  className={training ? 'text-label' : 'text-label-tertiary'}
                  style={[textStyles.caption, { fontSize: 10 }]}
                >
                  {training ? label : '–'}
                </Text>
              </View>
            );
          })}
          {row.length < 7
            ? Array.from({ length: 7 - row.length }, (_, i) => (
                <View key={`pad-${i}`} className="flex-1" />
              ))
            : null}
        </View>
      ))}
    </View>
  );
}
