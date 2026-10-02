import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Card, GlassActionButton, SectionHeader } from '@/components/ui';
import { formatWeight } from '@/features/auth';
import { useProfile } from '@/features/targets';
import type { UnitSystem } from '@/domain';
import { themeColor } from '@/theme/colors';

interface PrParam {
  exerciseId: string;
  newOneRepMaxKg: number;
  previousOneRepMaxKg: number | null;
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

  return (
    <View className="bg-system-background flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-label text-center text-lg font-semibold">
          {t('workout.summary.title')}
        </Text>

        <View className="items-center py-2">
          <SymbolView
            name="checkmark.circle.fill"
            size={72}
            tintColor={themeColor('accent')}
          />
        </View>

        <Card className="flex-row justify-between px-6 py-5">
          <Stat
            label={t('workout.summary.duration')}
            value={t('workout.summary.minutes', {
              minutes: params.durationMinutes ?? 0,
            })}
          />
          <Stat
            label={t('workout.summary.volume')}
            value={formatWeight(Number(params.volumeKg ?? 0), unitSystem, 0)}
          />
          <Stat
            label={t('workout.summary.kcalBurned')}
            value={`${params.kcalBurned} kcal`}
          />
        </Card>

        {bonusKcal > 0 && (
          <Card className="items-center">
            <Text className="text-tint text-center text-base font-semibold">
              {t('workout.summary.bonusKcal', { kcal: bonusKcal })}
            </Text>
          </Card>
        )}

        {prs.length > 0 && (
          <View className="gap-2">
            <SectionHeader title={t('workout.summary.prs')} />
            <Card className="gap-0 overflow-hidden p-0">
              {prs.map((pr, index) => (
                <View key={pr.exerciseId}>
                  {index > 0 && <View className="bg-separator h-px" />}
                  <View className="flex-row items-center gap-3 px-4 py-3">
                    <SymbolView
                      name="trophy.fill"
                      size={18}
                      tintColor={themeColor('accent')}
                    />
                    <Text className="text-label flex-1 text-sm">
                      {pr.previousOneRepMaxKg !== null
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
                          })}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center">
      <Text className="text-label text-lg font-bold">{value}</Text>
      <Text className="text-secondary-label text-xs">{label}</Text>
    </View>
  );
}
