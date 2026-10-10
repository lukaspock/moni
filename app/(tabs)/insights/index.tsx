import i18next from 'i18next';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Illustration } from '@/components/brand';
import { Reveal } from '@/components/motion';
import {
  Card,
  Chip,
  ListRow,
  Pill,
  ScreenTitle,
  SectionHeader,
} from '@/components/ui';

import {
  compareTrainingDays,
  currentStreak,
  filterByRange,
  kcalAdherence,
  kgToLb,
  roundTo,
  shiftIsoDate,
  weekStartFor,
  weekdayOfIso,
  isoWeekNumber,
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
import { EmptyState, InsightRow } from '@/features/insights/components';
import { useProfile } from '@/features/targets';
import { exerciseDisplayName, useExerciseCatalog } from '@/features/workout';
import { toISODate } from '@/lib/date';
import { fixedColors, themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

const RANGES: WeightRange[] = ['4w', '12w', 'all'];
const MIN_CORRELATION_DAYS = 14;

/** Locale-aware number ("94,5" in DE), max `decimals` fraction digits. */
function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat(i18next.language, {
    maximumFractionDigits: decimals,
  }).format(roundTo(value, decimals));
}

function formatSigned(value: number, decimals = 1): string {
  const r = roundTo(value, decimals);
  return r > 0 ? `+${formatNumber(r, decimals)}` : formatNumber(r, decimals);
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
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          selected={o.value === value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <SectionHeader title={title} />
      <Card>{children}</Card>
    </View>
  );
}

export default function InsightsScreen() {
  const { t, i18n } = useTranslation();
  const today = toISODate();
  const { profile } = useProfile();
  const { raw, trend, entries, isLoading: weightLoading } = useWeightTrend();
  const { days } = useDailySummaries(today);
  const { trends } = useExerciseTrends(today);
  const { exercises } = useExerciseCatalog();
  const { isImperial, toDisplay, unitLabelKey } = useWeightInput();
  const [range, setRange] = useState<WeightRange>('12w');
  const [kcalRange, setKcalRange] = useState<'7' | '30'>('7');

  const unit = t(unitLabelKey);
  const fmt = (kg: number) => formatNumber(toDisplay(kg));

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

  // --- weekly review entry (Sunday: this week, otherwise last week) + archive ---
  const thisWeek = weekStartFor(today);
  const reviewWeek =
    weekdayOfIso(today) === 0 ? thisWeek : shiftIsoDate(thisWeek, -7);
  const archiveWeeks = [1, 2, 3, 4].map((n) =>
    shiftIsoDate(reviewWeek, -7 * n),
  );
  const rangeLabel = (weekStart: string) => {
    const fmt = (iso: string) =>
      new Date(`${iso}T12:00:00`).toLocaleDateString(i18n.language, {
        day: 'numeric',
        month: 'short',
      });
    return t('rhythm.tideTable.range', {
      from: fmt(weekStart),
      to: fmt(shiftIsoDate(weekStart, 6)),
    });
  };
  const openWeek = (weekStart: string) =>
    router.push({ pathname: '/insights/week', params: { weekStart } });

  return (
    <View className="bg-bg flex-1">
      <ScreenTitle title={t('insights.title')} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-4 pb-10 pt-4"
      >
        {/* Weekly review entry */}
        <Reveal index={0}>
          <Card
            variant="tinted"
            onPress={() => openWeek(reviewWeek)}
            accessibilityLabel={`${t('insights.review.entryTitle')}, ${rangeLabel(reviewWeek)}`}
          >
            <View className="flex-row items-center gap-3">
              <View className="flex-1 gap-0.5">
                <Text className="text-label" style={textStyles.headline}>
                  {t('insights.review.entryTitle')}
                </Text>
                <Text
                  className="text-label-secondary"
                  style={textStyles.caption}
                >
                  {t('insights.review.entryBody', {
                    week: isoWeekNumber(reviewWeek),
                    range: rangeLabel(reviewWeek),
                  })}
                </Text>
              </View>
              <Pill label={t('rhythm.tideTable.newBadge')} tone="accent" />
              <SymbolView
                name="chevron.right"
                size={13}
                weight="bold"
                tintColor={themeColor('labelTertiary')}
              />
            </View>
          </Card>
        </Reveal>

        {/* Weight: the hero */}
        <Reveal index={1}>
          <View className="gap-3">
            <Card variant="hero">
              <View className="flex-row items-center justify-between">
                <Text
                  style={[
                    textStyles.overline,
                    { color: fixedColors.heroLabel2 },
                  ]}
                >
                  {t('insights.weight.title')}
                </Text>
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
                    tintColor={fixedColors.lime}
                  />
                  <Text
                    style={[
                      textStyles.callout,
                      { color: fixedColors.lime, fontWeight: '600' },
                    ]}
                  >
                    {t('insights.weight.logCta')}
                  </Text>
                </Pressable>
              </View>
              {weightLoading ? null : entries.length === 0 ? (
                <View className="items-center gap-3 py-4">
                  <Illustration
                    name="noData"
                    size={150}
                    color={fixedColors.heroLabel2}
                  />
                  <Text
                    style={[
                      textStyles.headline,
                      { color: fixedColors.heroLabel },
                    ]}
                  >
                    {t('insights.weight.emptyTitle')}
                  </Text>
                  <Text
                    className="text-center"
                    style={[
                      textStyles.callout,
                      { color: fixedColors.heroLabel2 },
                    ]}
                  >
                    {t('insights.weight.emptyBody')}
                  </Text>
                </View>
              ) : (
                <>
                  <View className="flex-row items-end justify-between">
                    <View>
                      <Text
                        style={[
                          textStyles.caption,
                          { color: fixedColors.heroLabel2 },
                        ]}
                      >
                        {t('insights.weight.trendLabel')}
                      </Text>
                      <Text
                        maxFontSizeMultiplier={1.15}
                        style={[
                          textStyles.numericL,
                          { color: fixedColors.heroLabel },
                        ]}
                      >
                        {fmt(trendNow ?? latestEntry!.weightKg)}{' '}
                        <Text style={textStyles.numericS}>{unit}</Text>
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        style={[
                          textStyles.caption,
                          { color: fixedColors.heroLabel2 },
                        ]}
                      >
                        {t('insights.weight.weeklyRateLabel')}
                      </Text>
                      <Text
                        style={[
                          textStyles.numericS,
                          { color: fixedColors.lime },
                        ]}
                      >
                        {rateDisplay === null
                          ? '–'
                          : t('insights.weight.weeklyRate', {
                              value: formatSigned(rateDisplay, 2),
                              unit,
                            })}
                      </Text>
                    </View>
                  </View>
                  <WeightTrendChart
                    variant="hero"
                    raw={rangeRaw}
                    trend={rangeTrend}
                    targetKg={targetKg}
                    formatWeight={fmt}
                    targetLabel={
                      targetKg != null
                        ? t('insights.weight.goalLabel', {
                            value: fmt(targetKg),
                            unit,
                          })
                        : undefined
                    }
                  />
                  {rateKg === null && (
                    <Text
                      style={[
                        textStyles.caption,
                        { color: fixedColors.heroLabel2 },
                      ]}
                    >
                      {t('insights.weight.noRate')}
                    </Text>
                  )}
                </>
              )}
            </Card>
            {entries.length > 0 && (
              <>
                <Segmented
                  value={range}
                  onChange={(v) => setRange(v as WeightRange)}
                  options={RANGES.map((r) => ({
                    value: r,
                    label: t(`insights.weight.range.${r}`),
                  }))}
                />
                <Card className="gap-0 overflow-hidden p-0">
                  <ListRow
                    title={t('insights.weight.allEntries')}
                    symbol="list.bullet"
                    onPress={() => router.push('/insights/weight-history')}
                  />
                </Card>
              </>
            )}
          </View>
        </Reveal>

        {/* Patterns */}
        <Reveal index={2}>
          <Card variant="tinted">
            <Text className="text-label" style={textStyles.headline}>
              {t('insights.correlations.title')}
            </Text>
            {insightRows.length === 0 ? (
              <Text className="text-label-secondary" style={textStyles.callout}>
                {t('insights.correlations.notEnough')}
              </Text>
            ) : (
              insightRows.map((row) => (
                <InsightRow key={row.text} icon={row.icon} text={row.text} />
              ))
            )}
          </Card>
        </Reveal>

        {/* Calories vs level */}
        <Reveal index={3}>
          <Section title={t('insights.kcal.title')}>
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
                <Text className="text-label" style={textStyles.headline}>
                  {t('insights.kcal.average', {
                    eaten: Math.round(adherence.avgEatenKcal),
                    target: Math.round(adherence.avgTargetKcal),
                  })}
                </Text>
                <Text
                  className="text-label-secondary"
                  style={textStyles.callout}
                >
                  {t('insights.kcal.daysOnTarget', {
                    count: adherence.daysOnTarget,
                    total: adherence.loggedDays,
                  })}
                </Text>
                {Math.abs(adherence.avgDeltaKcal) >= 25 && (
                  <Text
                    className="text-label-secondary"
                    style={textStyles.callout}
                  >
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
          </Section>
        </Reveal>

        {/* Training frequency + logging streak */}
        <Reveal index={4}>
          <Section title={t('insights.training.title')}>
            {totalWorkoutDays === 0 && loggedStreak === 0 ? (
              <EmptyState
                icon="figure.strengthtraining.traditional"
                title={t('insights.training.emptyTitle')}
                body={t('insights.training.emptyBody')}
              />
            ) : (
              <>
                <Text
                  className="text-label-secondary"
                  style={textStyles.overline}
                >
                  {t('insights.training.weeksLabel')}
                </Text>
                <WeeklyBars values={weeklyWorkouts} labels={weekBarLabels} />
                <Text
                  className="text-label-secondary"
                  style={textStyles.callout}
                >
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
          </Section>
        </Reveal>

        {/* Strength progress */}
        <Reveal index={5}>
          <Section title={t('insights.strength.title')}>
            {trends.length === 0 ? (
              <EmptyState
                icon="dumbbell"
                title={t('insights.strength.emptyTitle')}
                body={t('insights.strength.emptyBody')}
              />
            ) : (
              <>
                <Text
                  className="text-label-secondary"
                  style={textStyles.caption}
                >
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
                      className="min-h-11 flex-row items-center justify-between"
                    >
                      <View className="flex-1 pr-3">
                        <Text
                          className="text-label"
                          style={textStyles.headline}
                          numberOfLines={1}
                        >
                          {exerciseName(tr.exerciseId)}
                        </Text>
                        <Text
                          className="text-label-secondary"
                          style={textStyles.caption}
                        >
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
                          up
                            ? themeColor('accent')
                            : themeColor('labelSecondary')
                        }
                      />
                    </Pressable>
                  );
                })}
              </>
            )}
          </Section>
        </Reveal>

        {/* Earlier weeks */}
        <Reveal index={6}>
          <View className="gap-2">
            <SectionHeader title={t('rhythm.tideTable.archive')} />
            <Card className="gap-0 overflow-hidden p-0">
              {archiveWeeks.map((w, i) => (
                <ListRow
                  key={w}
                  title={t('insights.review.week', { week: isoWeekNumber(w) })}
                  subtitle={rangeLabel(w)}
                  symbol="calendar"
                  separator={i < archiveWeeks.length - 1}
                  onPress={() => openWeek(w)}
                />
              ))}
            </Card>
          </View>
        </Reveal>
      </ScrollView>
    </View>
  );
}
