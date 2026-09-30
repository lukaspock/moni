import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Host, Picker, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import {
  compareTrainingDays,
  currentStreak,
  filterByRange,
  kcalAdherence,
  kgToLb,
  roundTo,
  shiftIsoDate,
  weeklyRateKg,
  weightVsKcalCorrelation,
  workoutDaysPerWeek,
  type WeightRange,
} from '@/domain';
import {
  DailyKcalBars,
  type DailyKcalBar,
} from '@/components/charts/DailyKcalBars';
import { WeeklyBars } from '@/components/charts/WeeklyBars';
import { WeightTrendChart } from '@/components/charts/WeightTrendChart';
import {
  useDailySummaries,
  useExerciseTrends,
  useWeightInput,
  useWeightTrend,
} from '@/features/insights';
import {
  EmptyState,
  InsightCard,
  InsightRow,
} from '@/features/insights/components';
import { useProfile } from '@/features/targets';
import { exerciseDisplayName, useExerciseCatalog } from '@/features/workout';
import { toISODate } from '@/lib/date';
import { themeColor, useThemeHex } from '@/theme/colors';

const RANGES: WeightRange[] = ['4w', '12w', 'all'];
const MIN_CORRELATION_DAYS = 14;

function formatSigned(value: number, decimals = 1): string {
  const r = roundTo(value, decimals);
  return r > 0 ? `+${r}` : String(r);
}

function Legend({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        style={{
          width: 14,
          height: 0,
          borderTopWidth: 2,
          borderStyle: dashed ? 'dashed' : 'solid',
          borderColor: color,
        }}
      />
      <Text className="text-secondary-label text-xs">{label}</Text>
    </View>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Host matchContents style={{ width: '100%' }}>
      <Picker
        selection={value}
        onSelectionChange={(v) => onChange(String(v))}
        modifiers={[pickerStyle('segmented')]}
      >
        {options.map((o) => (
          <SwiftUIText key={o.value} modifiers={[tag(o.value)]}>
            {o.label}
          </SwiftUIText>
        ))}
      </Picker>
    </Host>
  );
}

export default function InsightsScreen() {
  const { t } = useTranslation();
  const today = toISODate();
  const { profile } = useProfile();
  const { raw, trend, entries, isLoading: weightLoading } = useWeightTrend();
  const { days } = useDailySummaries(today);
  const { trends } = useExerciseTrends(today);
  const { exercises } = useExerciseCatalog();
  const { isImperial, toDisplay, unitLabelKey } = useWeightInput();
  const [range, setRange] = useState<WeightRange>('12w');
  const [kcalRange, setKcalRange] = useState<'7' | '30'>('7');

  const accentHex = useThemeHex('accent');
  const dangerHex = useThemeHex('danger');
  const unit = t(unitLabelKey);
  const fmt = (kg: number) => String(toDisplay(kg));

  // --- weight ---
  const rangeRaw = useMemo(
    () => filterByRange(raw, range, today),
    [raw, range, today],
  );
  const rangeTrend = useMemo(
    () => filterByRange(trend, range, today),
    [trend, range, today],
  );
  const rateKg = useMemo(() => weeklyRateKg(trend), [trend]);
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const trendNow = trend.length > 0 ? trend[trend.length - 1].weightKg : null;
  const targetKg = profile?.target_weight_kg ?? null;
  const rateDisplay =
    rateKg === null ? null : roundTo(isImperial ? kgToLb(rateKg) : rateKg, 2);

  // --- calories ---
  const kcalDays = useMemo(() => {
    const from = shiftIsoDate(today, -(Number(kcalRange) - 1));
    return days.filter((d) => d.date >= from);
  }, [days, kcalRange, today]);
  const adherence = useMemo(() => kcalAdherence(kcalDays), [kcalDays]);
  const bars = useMemo<DailyKcalBar[]>(() => {
    const byDate = new Map(kcalDays.map((d) => [d.date, d]));
    const n = Number(kcalRange);
    return Array.from({ length: n }, (_, i) => {
      const date = shiftIsoDate(today, -(n - 1 - i));
      const d = byDate.get(date);
      return {
        key: date,
        label:
          n === 7
            ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                weekday: 'narrow',
              })
            : '',
        eatenKcal: d?.kcalEaten ?? 0,
        targetKcal: d?.targetKcal ?? null,
        logged: d?.logged ?? false,
      };
    });
  }, [kcalDays, kcalRange, today]);

  // --- training / consistency ---
  const weeklyWorkouts = useMemo(
    () => workoutDaysPerWeek(days, today, 4),
    [days, today],
  );
  const totalWorkoutDays = weeklyWorkouts.reduce((a, b) => a + b, 0);
  const loggedStreak = useMemo(
    () =>
      currentStreak(
        new Set(days.filter((d) => d.logged).map((d) => d.date)),
        today,
      ),
    [days, today],
  );
  const weekLabels = [t('insights.training.thisWeek')];
  const weekBarLabels = weeklyWorkouts.map((_, i) =>
    i === weeklyWorkouts.length - 1
      ? weekLabels[0]
      : `-${weeklyWorkouts.length - 1 - i}`,
  );

  // --- strength ---
  const exerciseName = (id: string) => {
    const ex = exercises.find((e) => e.id === id);
    return ex
      ? exerciseDisplayName(ex, t)
      : t('insights.strength.exerciseFallback');
  };

  // --- correlations ---
  const enoughDays =
    days.filter((d) => d.logged).length >= MIN_CORRELATION_DAYS;
  const comparison = useMemo(
    () => (enoughDays ? compareTrainingDays(days) : null),
    [days, enoughDays],
  );
  const weightLink = useMemo(
    () => (enoughDays ? weightVsKcalCorrelation(days, trend, today) : null),
    [days, trend, today, enoughDays],
  );
  const insightRows: {
    icon: 'fork.knife' | 'flame' | 'scalemass';
    text: string;
  }[] = [];
  if (comparison) {
    const training = Math.round(comparison.avgProteinTrainingG);
    const rest = Math.round(comparison.avgProteinRestG);
    insightRows.push({
      icon: 'fork.knife',
      text:
        rest < training * 0.85
          ? t('insights.correlations.proteinLower', { training, rest })
          : t('insights.correlations.protein', { training, rest }),
    });
    const delta = Math.round(comparison.avgKcalTrainingDelta);
    if (Math.abs(delta) >= 50) {
      insightRows.push({
        icon: 'flame',
        text: t('insights.correlations.kcalTraining', {
          value: Math.abs(delta),
          direction:
            delta < 0
              ? t('insights.correlations.directionUnder')
              : t('insights.correlations.directionOver'),
        }),
      });
    }
  }
  if (weightLink) {
    insightRows.push({
      icon: 'scalemass',
      text:
        weightLink.r >= 0.5
          ? t('insights.correlations.weightLink', { weeks: weightLink.weeks })
          : t('insights.correlations.weightNoLink', {
              weeks: weightLink.weeks,
            }),
    });
  }

  const card = (index: number, node: React.ReactNode) => (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      {node}
    </Animated.View>
  );

  return (
    <ScrollView
      className="bg-system-grouped-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-4 p-4 pb-10"
    >
      {/* Weight trend */}
      {card(
        0,
        <InsightCard
          title={t('insights.weight.title')}
          accessory={
            <Pressable
              onPress={() => router.push('/insights/weight-entry')}
              accessibilityRole="button"
              accessibilityLabel={t('insights.weight.logCta')}
              hitSlop={8}
              className="flex-row items-center gap-1"
            >
              <SymbolView
                name="plus.circle.fill"
                size={20}
                tintColor={themeColor('accent')}
              />
              <Text className="text-tint text-sm font-medium">
                {t('insights.weight.logCta')}
              </Text>
            </Pressable>
          }
        >
          {weightLoading || entries.length === 0 ? (
            weightLoading ? null : (
              <EmptyState
                icon="scalemass"
                title={t('insights.weight.emptyTitle')}
                body={t('insights.weight.emptyBody')}
              />
            )
          ) : (
            <>
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="text-secondary-label text-xs uppercase">
                    {t('insights.weight.trendLabel')}
                  </Text>
                  <Text className="text-label text-3xl font-bold">
                    {fmt(trendNow ?? latestEntry!.weightKg)}{' '}
                    <Text className="text-lg font-medium">{unit}</Text>
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-secondary-label text-xs uppercase">
                    {t('insights.weight.weeklyRateLabel')}
                  </Text>
                  <Text className="text-label text-base font-semibold">
                    {rateDisplay === null
                      ? '–'
                      : t('insights.weight.weeklyRate', {
                          value: formatSigned(rateDisplay, 2),
                          unit,
                        })}
                  </Text>
                </View>
              </View>
              <Segmented
                value={range}
                onChange={(v) => setRange(v as WeightRange)}
                options={RANGES.map((r) => ({
                  value: r,
                  label: t(`insights.weight.range.${r}`),
                }))}
              />
              <WeightTrendChart
                raw={rangeRaw}
                trend={rangeTrend}
                targetKg={targetKg}
                formatWeight={fmt}
              />
              <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
                <Legend
                  color={accentHex}
                  label={t('insights.weight.legendTrend')}
                />
                {targetKg != null && (
                  <Legend
                    color={dangerHex}
                    dashed
                    label={t('insights.weight.goalLabel', {
                      value: fmt(targetKg),
                      unit,
                    })}
                  />
                )}
              </View>
              {rateKg === null && (
                <Text className="text-secondary-label text-xs">
                  {t('insights.weight.noRate')}
                </Text>
              )}
              <Pressable
                onPress={() => router.push('/insights/weight-history')}
                accessibilityRole="button"
                className="flex-row items-center justify-between pt-1"
              >
                <Text className="text-tint text-sm">
                  {t('insights.weight.allEntries')}
                </Text>
                <SymbolView
                  name="chevron.right"
                  size={12}
                  tintColor="secondaryLabel"
                />
              </Pressable>
            </>
          )}
        </InsightCard>,
      )}

      {/* Calories vs target */}
      {card(
        1,
        <InsightCard title={t('insights.kcal.title')}>
          <Segmented
            value={kcalRange}
            onChange={(v) => setKcalRange(v as '7' | '30')}
            options={[
              { value: '7', label: t('insights.kcal.range.7') },
              { value: '30', label: t('insights.kcal.range.30') },
            ]}
          />
          {adherence ? (
            <>
              <View
                accessible
                accessibilityLabel={t('insights.kcal.barsLabel')}
              >
                <DailyKcalBars bars={bars} />
              </View>
              <Text className="text-label text-base font-semibold">
                {t('insights.kcal.average', {
                  eaten: Math.round(adherence.avgEatenKcal),
                  target: Math.round(adherence.avgTargetKcal),
                })}
              </Text>
              <Text className="text-secondary-label text-sm">
                {t('insights.kcal.daysOnTarget', {
                  count: adherence.daysOnTarget,
                  total: adherence.loggedDays,
                })}
              </Text>
              {Math.abs(adherence.avgDeltaKcal) >= 25 && (
                <Text className="text-secondary-label text-sm">
                  {adherence.avgDeltaKcal < 0
                    ? t('insights.kcal.under', {
                        value: Math.round(-adherence.avgDeltaKcal),
                      })
                    : t('insights.kcal.over', {
                        value: Math.round(adherence.avgDeltaKcal),
                      })}
                </Text>
              )}
            </>
          ) : (
            <EmptyState
              icon="fork.knife"
              title={t('insights.kcal.emptyTitle')}
              body={t('insights.kcal.emptyBody')}
            />
          )}
        </InsightCard>,
      )}

      {/* Training frequency + logging streak */}
      {card(
        2,
        <InsightCard title={t('insights.training.title')}>
          {totalWorkoutDays === 0 && loggedStreak === 0 ? (
            <EmptyState
              icon="figure.strengthtraining.traditional"
              title={t('insights.training.emptyTitle')}
              body={t('insights.training.emptyBody')}
            />
          ) : (
            <>
              <Text className="text-secondary-label text-xs uppercase">
                {t('insights.training.weeksLabel')}
              </Text>
              <WeeklyBars values={weeklyWorkouts} labels={weekBarLabels} />
              <Text className="text-secondary-label text-sm">
                {t('insights.training.total', { count: totalWorkoutDays })}
              </Text>
              <InsightRow
                icon="flame"
                text={
                  loggedStreak > 0
                    ? t('insights.training.loggingStreak', {
                        count: loggedStreak,
                      })
                    : t('insights.training.noStreak')
                }
              />
            </>
          )}
        </InsightCard>,
      )}

      {/* Strength progress */}
      {card(
        3,
        <InsightCard title={t('insights.strength.title')}>
          {trends.length === 0 ? (
            <EmptyState
              icon="dumbbell"
              title={t('insights.strength.emptyTitle')}
              body={t('insights.strength.emptyBody')}
            />
          ) : (
            <>
              <Text className="text-secondary-label text-xs">
                {t('insights.strength.caption')}
              </Text>
              {trends.map((tr) => {
                const up = tr.latestOneRmKg >= tr.firstOneRmKg;
                return (
                  <Pressable
                    key={tr.exerciseId}
                    onPress={() =>
                      router.push({
                        pathname: '/training/exercise/[id]',
                        params: { id: tr.exerciseId },
                      })
                    }
                    accessibilityRole="button"
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-label text-base" numberOfLines={1}>
                        {exerciseName(tr.exerciseId)}
                      </Text>
                      <Text className="text-secondary-label text-xs">
                        {t('insights.strength.change', {
                          from: fmt(tr.firstOneRmKg),
                          to: fmt(tr.latestOneRmKg),
                          unit,
                        })}
                      </Text>
                    </View>
                    <SymbolView
                      name={up ? 'arrow.up.right' : 'arrow.down.right'}
                      size={18}
                      tintColor={
                        up ? themeColor('accent') : themeColor('danger')
                      }
                    />
                  </Pressable>
                );
              })}
            </>
          )}
        </InsightCard>,
      )}

      {/* Correlation insights */}
      {card(
        4,
        <InsightCard title={t('insights.correlations.title')}>
          {insightRows.length === 0 ? (
            <Text className="text-secondary-label text-sm">
              {t('insights.correlations.notEnough')}
            </Text>
          ) : (
            insightRows.map((row) => (
              <InsightRow key={row.text} icon={row.icon} text={row.text} />
            ))
          )}
        </InsightCard>,
      )}
    </ScrollView>
  );
}
