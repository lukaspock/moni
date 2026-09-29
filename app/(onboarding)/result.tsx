import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Motivation } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { CountUpText } from '@/features/auth/components/CountUpText';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { WeightProjectionChart } from '@/features/auth/components/WeightProjectionChart';
import { formatKcal, formatLongDate, formatWeight } from '@/features/auth/format';
import { useDraftProjection } from '@/features/auth/useDraftProjection';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';

function MacroTile({ label, grams, delay }: { label: string; grams: number; delay: number }) {
  return (
    <View className="flex-1 items-center gap-0.5 rounded-xl bg-system-background py-2.5">
      <CountUpText
        value={grams}
        startFrom={0}
        duration={800 + delay}
        format={(v) => `${Math.round(v)} g`}
        className="text-lg font-bold text-label"
      />
      <Text className="text-xs text-secondary-label">{label}</Text>
    </View>
  );
}

function DayCard({
  title,
  kcal,
  bonusLabel,
  protein,
  carbs,
  fat,
  macroLabels,
  index,
}: {
  title: string;
  kcal: number;
  bonusLabel?: string;
  protein: number;
  carbs: number;
  fat: number;
  macroLabels: { protein: string; carbs: string; fat: string; kcal: string };
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(120 + index * 120)}
      className="gap-3 rounded-3xl bg-secondary-system-background p-5"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase text-secondary-label">{title}</Text>
        {bonusLabel ? <Text className="text-sm font-semibold text-bonus">{bonusLabel}</Text> : null}
      </View>
      <View className="flex-row items-baseline gap-2">
        <CountUpText
          value={kcal}
          startFrom={0}
          duration={900}
          format={formatKcal}
          className="text-5xl font-bold text-label"
        />
        <Text className="text-lg font-semibold text-secondary-label">{macroLabels.kcal}</Text>
      </View>
      <View className="flex-row gap-2">
        <MacroTile label={macroLabels.protein} grams={protein} delay={0} />
        <MacroTile label={macroLabels.carbs} grams={carbs} delay={100} />
        <MacroTile label={macroLabels.fat} grams={fat} delay={200} />
      </View>
    </Animated.View>
  );
}

export default function ResultScreen() {
  const { t } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const projection = useDraftProjection();
  const { goNext } = useOnboardingNavigation('result');

  if (!projection) {
    return (
      <View className="flex-1 items-center justify-center bg-system-background px-8">
        <Text className="text-center text-base text-secondary-label">{t('account.profile.noProfile')}</Text>
      </View>
    );
  }

  const { preview } = projection;
  const { flags } = preview.base;
  const name = draft.displayName.trim();
  const unit = draft.unitSystem;
  const macroLabels = {
    protein: t('account.onboarding.result.protein'),
    carbs: t('account.onboarding.result.carbs'),
    fat: t('account.onboarding.result.fat'),
    kcal: t('account.onboarding.result.kcal'),
  };
  const motivationLines: Record<Motivation, string> = {
    health: t('account.onboarding.result.motivation.health'),
    look: t('account.onboarding.result.motivation.look'),
    performance: t('account.onboarding.result.motivation.performance'),
    energy: t('account.onboarding.result.motivation.energy'),
    confidence: t('account.onboarding.result.motivation.confidence'),
  };
  const hasTraining = draft.trainingWeekdays.length > 0;
  const target = draft.goal === 'maintain' ? null : draft.targetWeightKg;

  return (
    <OnboardingScreen
      title={name ? t('account.onboarding.result.title', { name }) : t('account.onboarding.result.titleNoName')}
      subtitle={draft.motivation ? motivationLines[draft.motivation] : t('account.onboarding.result.subtitle')}
      continueLabel={t('account.onboarding.result.cta')}
      onContinue={() => goNext()}
    >
      <DayCard
        index={0}
        title={t('account.onboarding.result.restDay')}
        kcal={preview.restDay.totalKcal}
        protein={preview.restDay.proteinG}
        carbs={preview.restDay.carbsG}
        fat={preview.restDay.fatG}
        macroLabels={macroLabels}
      />
      {hasTraining ? (
        <DayCard
          index={1}
          title={t('account.onboarding.result.trainingDay')}
          kcal={preview.trainingDay.totalKcal}
          bonusLabel={t('account.onboarding.result.workoutBonus', { value: preview.trainingDay.workoutBonusKcal })}
          protein={preview.trainingDay.proteinG}
          carbs={preview.trainingDay.carbsG}
          fat={preview.trainingDay.fatG}
          macroLabels={macroLabels}
        />
      ) : null}

      <Animated.View
        entering={FadeInDown.duration(300).delay(380)}
        className="gap-3 rounded-3xl bg-secondary-system-background p-5"
      >
        <Text className="text-sm font-semibold uppercase text-secondary-label">
          {t('account.onboarding.result.projectionTitle')}
        </Text>
        <WeightProjectionChart
          points={projection.curve}
          startLabel={formatWeight(draft.weightKg ?? 0, unit)}
          endLabel={
            target != null && projection.targetDate
              ? t('account.onboarding.result.projectionReach', {
                  target: formatWeight(target, unit),
                  date: formatLongDate(projection.targetDate),
                })
              : t('account.onboarding.result.projectionMaintain', { value: formatWeight(draft.weightKg ?? 0, unit) })
          }
        />
        <Text className="text-xs text-secondary-label">{t('account.onboarding.result.projectionNote')}</Text>
      </Animated.View>

      <Text className="text-sm leading-5 text-secondary-label">{t('account.onboarding.result.explanation')}</Text>

      {flags.deficitCapped ? (
        <Text className="text-sm text-destructive">{t('account.onboarding.result.guardrailDeficit')}</Text>
      ) : null}
      {flags.surplusCapped ? (
        <Text className="text-sm text-destructive">{t('account.onboarding.result.guardrailSurplus')}</Text>
      ) : null}
      {flags.minimumFloorApplied ? (
        <Text className="text-sm text-destructive">{t('account.onboarding.result.guardrailMinimum')}</Text>
      ) : null}
    </OnboardingScreen>
  );
}
