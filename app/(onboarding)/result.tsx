import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { computeOnboardingPreview } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';

function MacroRow({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-base text-secondary-label">{label}</Text>
      <Text className="text-base font-semibold text-label">{Math.round(value)} g</Text>
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
}: {
  title: string;
  kcal: number;
  bonusLabel?: string;
  protein: number;
  carbs: number;
  fat: number;
  macroLabels: { protein: string; carbs: string; fat: string };
}) {
  return (
    <View className="gap-3 rounded-2xl border border-separator bg-secondary-system-background p-5">
      <Text className="text-sm font-semibold uppercase text-secondary-label">{title}</Text>
      <Text className="text-4xl font-bold text-label">{Math.round(kcal)}</Text>
      {bonusLabel ? <Text className="text-sm text-tint">{bonusLabel}</Text> : null}
      <View className="gap-1.5 pt-2">
        <MacroRow label={macroLabels.protein} value={protein} />
        <MacroRow label={macroLabels.carbs} value={carbs} />
        <MacroRow label={macroLabels.fat} value={fat} />
      </View>
    </View>
  );
}

export default function ResultScreen() {
  const { t } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const markCompleted = useOnboardingStore((s) => s.markCompleted);

  const preview = useMemo(() => {
    if (!draft.sex || !draft.birthDate || !draft.heightCm || !draft.weightKg || !draft.activityLevel || !draft.goal) {
      return null;
    }
    return computeOnboardingPreview({
      sex: draft.sex,
      birthDate: new Date(`${draft.birthDate}T00:00:00`),
      heightCm: draft.heightCm,
      weightKg: draft.weightKg,
      activityLevel: draft.activityLevel,
      goal: draft.goal,
      goalRateKgPerWeek: draft.goalRateKgPerWeek,
      hasTrainingDays: draft.trainingWeekdays.length > 0,
      eatBackFactor: draft.eatBackFactor,
    });
  }, [draft]);

  if (!preview) {
    return (
      <View className="flex-1 items-center justify-center bg-system-background px-8">
        <Text className="text-center text-base text-secondary-label">{t('account.profile.noProfile')}</Text>
      </View>
    );
  }

  const { flags } = preview.base;
  const macroLabels = {
    protein: t('account.onboarding.result.protein'),
    carbs: t('account.onboarding.result.carbs'),
    fat: t('account.onboarding.result.fat'),
  };

  return (
    <OnboardingScreen
      title={t('account.onboarding.result.title')}
      subtitle={t('account.onboarding.result.subtitle')}
      continueLabel={t('account.onboarding.result.cta')}
      onContinue={() => {
        markCompleted();
        router.replace('/(auth)/sign-in');
      }}
    >
      <DayCard
        title={t('account.onboarding.result.restDay')}
        kcal={preview.restDay.totalKcal}
        protein={preview.restDay.proteinG}
        carbs={preview.restDay.carbsG}
        fat={preview.restDay.fatG}
        macroLabels={macroLabels}
      />
      {draft.trainingWeekdays.length > 0 ? (
        <DayCard
          title={t('account.onboarding.result.trainingDay')}
          kcal={preview.trainingDay.totalKcal}
          bonusLabel={t('account.onboarding.result.workoutBonus', { value: preview.trainingDay.workoutBonusKcal })}
          protein={preview.trainingDay.proteinG}
          carbs={preview.trainingDay.carbsG}
          fat={preview.trainingDay.fatG}
          macroLabels={macroLabels}
        />
      ) : null}

      <Text className="text-sm text-secondary-label">{t('account.onboarding.result.explanation')}</Text>

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
