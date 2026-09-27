import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { GlassView } from 'expo-glass-effect';

interface PrParam {
  exerciseId: string;
  newOneRepMaxKg: number;
  previousOneRepMaxKg: number | null;
}

export default function WorkoutSummaryScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    durationMinutes: string;
    kcalBurned: string;
    volumeKg: string;
    bonusKcal: string;
    prs: string;
  }>();

  const prs: PrParam[] = useMemo(() => {
    try {
      return JSON.parse(params.prs ?? '[]') as PrParam[];
    } catch {
      return [];
    }
  }, [params.prs]);

  return (
    <View className="flex-1 bg-system-background">
      <ScrollView contentContainerClassName="items-center gap-6 px-6 pb-32 pt-20">
        <SymbolView name="checkmark.circle.fill" size={64} />
        <Text className="text-2xl font-bold text-label">{t('workout.summary.title')}</Text>

        <View className="w-full flex-row justify-between rounded-2xl bg-secondary-system-background p-5">
          <Stat label={t('workout.summary.duration')} value={`${params.durationMinutes} min`} />
          <Stat label={t('workout.summary.volume')} value={`${params.volumeKg} kg`} />
          <Stat label={t('workout.summary.kcalBurned')} value={`${params.kcalBurned} kcal`} />
        </View>

        <View className="w-full rounded-2xl bg-tint/10 p-4">
          <Text className="text-center text-base font-semibold text-tint">
            {t('workout.summary.bonusKcal', { kcal: params.bonusKcal })}
          </Text>
        </View>

        {prs.length > 0 && (
          <View className="w-full gap-2">
            <Text className="text-base font-semibold text-label">{t('workout.summary.prs')}</Text>
            {prs.map((pr) => (
              <View key={pr.exerciseId} className="flex-row items-center gap-2 rounded-xl bg-secondary-system-background p-3">
                <SymbolView name="trophy.fill" size={18} />
                <Text className="flex-1 text-sm text-label">
                  {pr.previousOneRepMaxKg !== null
                    ? t('workout.summary.prNew', {
                        kg: Math.round(pr.newOneRepMaxKg),
                        previous: Math.round(pr.previousOneRepMaxKg),
                      })
                    : t('workout.summary.prFirst', { kg: Math.round(pr.newOneRepMaxKg) })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <GlassView glassEffectStyle="regular" isInteractive className="absolute bottom-0 left-0 right-0 px-6 py-4 pb-10">
        <Pressable
          onPress={() => router.dismissAll()}
          className="items-center rounded-xl bg-tint py-3.5"
        >
          <Text className="text-base font-semibold text-white">{t('workout.summary.done')}</Text>
        </Pressable>
      </GlassView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center">
      <Text className="text-lg font-bold text-label">{value}</Text>
      <Text className="text-xs text-secondary-label">{label}</Text>
    </View>
  );
}
