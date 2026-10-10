import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Celebration, Reveal, RollingNumber } from '@/components/motion';
import {
  Card,
  GlassActionButton,
  IconTile,
  ListRow,
  SectionHeader,
} from '@/components/ui';
import { formatWeight } from '@/features/auth';
import {
  useFoodTotals,
  useQuickLogEntries,
  useQuickLogMeal,
  type QuickLogEntry,
} from '@/features/food';
import { useAchievements, useWeekTally } from '@/features/rhythm';
import { useDailyTargets, useProfile } from '@/features/targets';
import { kgToLb, type UnitSystem } from '@/domain';
import { toISODate } from '@/lib/date';
import { fixedColors, themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

interface PrParam {
  exerciseId: string;
  newOneRepMaxKg: number;
  previousOneRepMaxKg: number | null;
}

const BRIDGE_MIN_PROTEIN_G = 25;
const BRIDGE_PROTEIN_SHARE = 0.6;

function entryProteinG(entry: QuickLogEntry): number {
  const raw = entry.favorite
    ? ((entry.favorite.items as unknown as { protein_g?: number }[] | null) ??
      [])
    : (entry.log?.items ?? []);
  return raw.reduce((sum, item) => sum + (item.protein_g ?? 0), 0);
}

export default function WorkoutSummaryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    durationMinutes: string;
    kcalBurned: string;
    volumeKg: string;
    bonusKcal: string;
    prs: string;
  }>();

  const { profile } = useProfile();
  const unitSystem: UnitSystem =
    profile?.unit_system === 'imperial' ? 'imperial' : 'metric';

  const prs: PrParam[] = useMemo(() => {
    try {
      return JSON.parse(params.prs ?? '[]') as PrParam[];
    } catch {
      return [];
    }
  }, [params.prs]);
  const bonusKcal = Number(params.bonusKcal ?? 0);
  const volumeKg = Number(params.volumeKg ?? 0);
  const volumeDisplay = Math.round(
    unitSystem === 'imperial' ? kgToLb(volumeKg) : volumeKg,
  );
  const volumeUnit = unitSystem === 'imperial' ? 'lb' : 'kg';

  // Celebration fires once on arrival.
  const [celebrate, setCelebrate] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setCelebrate(1), 350);
    return () => clearTimeout(id);
  }, []);

  // Stamp unlocked by this session (snapshot, then acknowledged).
  const { celebrate: toCelebrate, acknowledge } = useAchievements();
  const [stampId, setStampId] = useState<string | null>(null);
  if (stampId === null && toCelebrate.length > 0) {
    setStampId(toCelebrate[0].id);
  }
  useEffect(() => {
    if (stampId !== null) acknowledge([stampId]);
  }, [stampId, acknowledge]);

  const week = useWeekTally();
  const trainingRing = week.isReady ? week.rings.training : null;

  // Protein bridge.
  const today = toISODate();
  const { totals } = useFoodTotals(today);
  const { targets } = useDailyTargets(today);
  const { favorites, recents } = useQuickLogEntries();
  const quickLog = useQuickLogMeal();
  const [logged, setLogged] = useState<string[]>([]);
  const bridgeEntries = useMemo(
    () =>
      [...favorites, ...recents]
        .map((entry) => ({ entry, protein: entryProteinG(entry) }))
        .filter((e) => e.protein >= BRIDGE_MIN_PROTEIN_G)
        .sort((a, b) => b.protein - a.protein)
        .slice(0, 3),
    [favorites, recents],
  );
  const showBridge =
    targets !== null &&
    targets.proteinG > 0 &&
    totals.proteinG < targets.proteinG * BRIDGE_PROTEIN_SHARE &&
    bridgeEntries.length > 0;

  let step = 0;
  const hero = fixedColors.heroLabel;

  return (
    <View className="bg-bg flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Reveal index={step++}>
          <Text
            accessibilityRole="header"
            className="text-label text-center"
            style={textStyles.title}
          >
            {t('workout.summary.title')}
          </Text>
        </Reveal>

        <Reveal index={step++}>
          <Card variant="hero" className="gap-4">
            <View className="flex-row justify-between">
              <Stat label={t('workout.summary.duration')}>
                <RollingNumber
                  value={Number(params.durationMinutes ?? 0)}
                  startFrom={0}
                  fontSize={32}
                  color={hero}
                  mode="count"
                  format={(v) => String(Math.round(v))}
                />
                <Unit>{t('workout.summary.minuteUnit')}</Unit>
              </Stat>
              <Stat label={t('workout.summary.volume')}>
                <RollingNumber
                  value={volumeDisplay}
                  startFrom={0}
                  fontSize={32}
                  color={hero}
                  mode="count"
                  format={(v) => String(Math.round(v))}
                />
                <Unit>{volumeUnit}</Unit>
              </Stat>
              <Stat label={t('workout.summary.kcalBurned')}>
                <RollingNumber
                  value={Number(params.kcalBurned ?? 0)}
                  startFrom={0}
                  fontSize={32}
                  color={hero}
                  mode="count"
                  format={(v) => String(Math.round(v))}
                />
                <Unit>kcal</Unit>
              </Stat>
            </View>
          </Card>
        </Reveal>

        {bonusKcal > 0 && (
          <Reveal index={step++}>
            <Card variant="tinted" tone="bonus" className="items-center">
              <Text
                accessibilityRole="text"
                className="text-label text-center"
                style={textStyles.numericS}
              >
                {t('workout.summary.bonusKcal', { kcal: bonusKcal })}
              </Text>
            </Card>
          </Reveal>
        )}

        {prs.length > 0 && (
          <Reveal index={step++}>
            <View className="gap-2">
              <SectionHeader title={t('workout.summary.prs')} />
              <Card className="gap-0 overflow-hidden p-0">
                {prs.map((pr, index) => (
                  <ListRow
                    key={pr.exerciseId}
                    title={
                      pr.previousOneRepMaxKg !== null
                        ? t('workout.summary.prNew', {
                            weight: formatWeight(
                              pr.newOneRepMaxKg,
                              unitSystem,
                              0,
                            ),
                            previous: formatWeight(
                              pr.previousOneRepMaxKg,
                              unitSystem,
                              0,
                            ),
                          })
                        : t('workout.summary.prFirst', {
                            weight: formatWeight(
                              pr.newOneRepMaxKg,
                              unitSystem,
                              0,
                            ),
                          })
                    }
                    symbol="trophy.fill"
                    iconTone="bonus"
                    separator={index < prs.length - 1}
                  />
                ))}
              </Card>
            </View>
          </Reveal>
        )}

        {trainingRing && (
          <Reveal index={step++}>
            <Card className="flex-row items-center gap-3">
              <IconTile
                symbol="figure.strengthtraining.traditional"
                tone="bonus"
              />
              <Text className="text-label flex-1" style={textStyles.headline}>
                {t('workout.summary.weekTraining', {
                  done: trainingRing.done,
                  goal: trainingRing.goal,
                })}
              </Text>
            </Card>
          </Reveal>
        )}

        {stampId !== null && (
          <Reveal index={step++}>
            <Card variant="tinted" tone="accent" className="gap-1">
              <View className="flex-row items-center gap-2">
                <SymbolView
                  name="seal.fill"
                  size={18}
                  tintColor={themeColor('accent')}
                />
                <Text
                  className="text-label-secondary"
                  style={textStyles.caption}
                >
                  {t('workout.summary.stamp')}
                </Text>
              </View>
              <Text className="text-label" style={textStyles.headline}>
                {t(
                  `achievements.${stampId}.name` as 'achievements.firstWorkout.name',
                )}
              </Text>
              <Text className="text-label-secondary" style={textStyles.callout}>
                {t(
                  `achievements.${stampId}.celebrate` as 'achievements.firstWorkout.celebrate',
                )}
              </Text>
            </Card>
          </Reveal>
        )}

        {showBridge && (
          <Reveal index={step++}>
            <View className="gap-2">
              <Text
                className="text-label-secondary px-1"
                style={textStyles.callout}
              >
                {t('identity.workout.proteinWindow')}
              </Text>
              <Card className="gap-0 overflow-hidden p-0">
                {bridgeEntries.map(({ entry, protein }, index) => {
                  const done = logged.includes(entry.key);
                  return (
                    <ListRow
                      key={entry.key}
                      title={entry.title}
                      subtitle={t('workout.summary.bridgeProtein', {
                        grams: Math.round(protein),
                      })}
                      symbol={done ? 'checkmark' : 'plus'}
                      iconTone="protein"
                      chevron={false}
                      value={
                        done ? t('workout.summary.bridgeLogged') : undefined
                      }
                      separator={index < bridgeEntries.length - 1}
                      accessibilityLabel={t('workout.summary.bridgeLogLabel', {
                        title: entry.title,
                      })}
                      onPress={
                        done
                          ? undefined
                          : () => {
                              setLogged((l) => [...l, entry.key]);
                              quickLog.mutate({ entry });
                            }
                      }
                    />
                  );
                })}
              </Card>
            </View>
          </Reveal>
        )}
      </ScrollView>

      <Celebration
        kind={prs.length > 0 ? 'pr' : 'workoutDone'}
        trigger={celebrate}
        origin={{ x: 200, y: insets.top + 160 }}
        style={{ position: 'absolute', inset: 0 }}
      />

      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 bottom-0 px-5"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <GlassActionButton
          label={t('workout.summary.done')}
          symbol="checkmark"
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="items-center gap-0.5">
      <View className="flex-row items-baseline gap-1">{children}</View>
      <Text style={{ ...textStyles.caption, color: fixedColors.heroLabel2 }}>
        {label}
      </Text>
    </View>
  );
}

function Unit({ children }: { children: string }) {
  return (
    <Text style={{ ...textStyles.caption, color: fixedColors.heroLabel2 }}>
      {children}
    </Text>
  );
}
