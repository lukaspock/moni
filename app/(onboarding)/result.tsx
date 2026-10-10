import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { Reveal, RollingNumber } from '@/components/motion';
import type { Motivation } from '@/domain';
import { useOnboardingStore } from '@/features/auth';
import { CountUpText } from '@/features/auth/components/CountUpText';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { HoldToStart } from '@/features/auth/components/HoldToStart';
import { WeightProjectionChart } from '@/features/auth/components/WeightProjectionChart';
import {
  formatKcal,
  formatLongDate,
  formatWeight,
} from '@/features/auth/format';
import { useDraftProjection } from '@/features/auth/useDraftProjection';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';
import { fixedColors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

function MacroTile({
  label,
  grams,
  delay,
  onHero,
}: {
  label: string;
  grams: number;
  delay: number;
  onHero?: boolean;
}) {
  return (
    <View
      className={`flex-1 items-center gap-0.5 rounded-xl py-2.5 ${onHero ? 'bg-white/10' : 'bg-surface-raised'}`}
    >
      <CountUpText
        value={grams}
        startFrom={0}
        duration={800 + delay}
        format={(v) => `${Math.round(v)} g`}
        className={`font-display-bold text-lg ${onHero ? 'text-hero-label' : 'text-label'}`}
      />
      <Text
        className={`text-xs ${onHero ? 'text-hero-label-2' : 'text-label-secondary'}`}
      >
        {label}
      </Text>
    </View>
  );
}

type MacroLabels = {
  protein: string;
  carbs: string;
  fat: string;
  kcal: string;
};

/** Hero moment: the rest-day level (base) as a big rolling number. */
function LevelHero({
  kcal,
  protein,
  carbs,
  fat,
  macroLabels,
  groupSeparator,
}: {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  macroLabels: MacroLabels;
  groupSeparator: string;
}) {
  const { t } = useTranslation();
  return (
    <Reveal>
      <Card variant="hero" className="gap-4">
        <View className="gap-1">
          <Text className="text-xs font-semibold uppercase tracking-widest text-hero-label-2">
            {t('account.onboarding.result.levelLabel')} ·{' '}
            {t('account.onboarding.result.restDay')}
          </Text>
          <RollingNumber
            value={kcal}
            startFrom={0}
            fontSize={72}
            fontFamily={fontFamily.displayBlack}
            color={fixedColors.heroLabel}
            glowColor={fixedColors.lime}
            groupSeparator={groupSeparator}
            accessibilityLabel={`${formatKcal(kcal)} ${macroLabels.kcal}`}
          />
          <Text className="text-base font-semibold text-hero-label-2">
            {t('account.onboarding.result.kcalPerDay')}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <MacroTile
            onHero
            label={macroLabels.protein}
            grams={protein}
            delay={0}
          />
          <MacroTile
            onHero
            label={macroLabels.carbs}
            grams={carbs}
            delay={100}
          />
          <MacroTile onHero label={macroLabels.fat} grams={fat} delay={200} />
        </View>
      </Card>
    </Reveal>
  );
}

function TrainingDayCard({
  kcal,
  bonusLabel,
  protein,
  carbs,
  fat,
  macroLabels,
}: {
  kcal: number;
  bonusLabel: string;
  protein: number;
  carbs: number;
  fat: number;
  macroLabels: MacroLabels;
}) {
  const { t } = useTranslation();
  return (
    <Reveal index={1} delay={200}>
      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-label-secondary text-xs font-semibold uppercase tracking-widest">
            {t('account.onboarding.result.trainingDay')}
          </Text>
          <Text className="text-bonus text-sm font-semibold">{bonusLabel}</Text>
        </View>
        <View className="flex-row items-baseline gap-2">
          <CountUpText
            value={kcal}
            startFrom={0}
            duration={900}
            format={formatKcal}
            className="text-label font-display-black text-[44px] leading-[48px]"
          />
          <Text className="text-label-secondary text-lg font-semibold">
            {macroLabels.kcal}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <MacroTile label={macroLabels.protein} grams={protein} delay={0} />
          <MacroTile label={macroLabels.carbs} grams={carbs} delay={100} />
          <MacroTile label={macroLabels.fat} grams={fat} delay={200} />
        </View>
      </Card>
    </Reveal>
  );
}

export default function ResultScreen() {
  const { t, i18n } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const projection = useDraftProjection();
  const { goNext } = useOnboardingNavigation('result');

  if (!projection) {
    return (
      <View className="bg-bg flex-1 items-center justify-center px-8">
        <Text className="text-label-secondary text-center text-base">
          {t('account.profile.noProfile')}
        </Text>
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
      title={
        name
          ? t('account.onboarding.result.title', { name })
          : t('account.onboarding.result.titleNoName')
      }
      subtitle={
        draft.motivation
          ? motivationLines[draft.motivation]
          : t('account.onboarding.result.subtitle')
      }
      footerNote={
        <View className="pb-2">
          <HoldToStart
            title={t('account.onboarding.result.hold')}
            hint={t('account.onboarding.result.holdHint')}
            a11yHint={t('account.onboarding.result.holdA11yHint')}
            fallbackLabel={t('account.onboarding.result.start')}
            onComplete={() => goNext()}
          />
        </View>
      }
    >
      <LevelHero
        kcal={preview.restDay.totalKcal}
        protein={preview.restDay.proteinG}
        carbs={preview.restDay.carbsG}
        fat={preview.restDay.fatG}
        macroLabels={macroLabels}
        groupSeparator={i18n.language.startsWith('de') ? '.' : ','}
      />
      {hasTraining ? (
        <TrainingDayCard
          kcal={preview.trainingDay.totalKcal}
          bonusLabel={t('account.onboarding.result.workoutBonus', {
            value: preview.trainingDay.workoutBonusKcal,
          })}
          protein={preview.trainingDay.proteinG}
          carbs={preview.trainingDay.carbsG}
          fat={preview.trainingDay.fatG}
          macroLabels={macroLabels}
        />
      ) : null}

      <Reveal index={2} delay={300}>
        <Card className="gap-3">
          <Text className="text-label-secondary text-xs font-semibold uppercase tracking-widest">
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
                : t('account.onboarding.result.projectionMaintain', {
                    value: formatWeight(draft.weightKg ?? 0, unit),
                  })
            }
          />
          <Text className="text-label-tertiary text-xs">
            {t('account.onboarding.result.projectionNote')}
          </Text>
        </Card>
      </Reveal>

      <Text className="text-label-secondary text-sm leading-5">
        {t('account.onboarding.result.explanation')}
      </Text>

      {flags.deficitCapped ? (
        <Text className="text-destructive text-sm">
          {t('account.onboarding.result.guardrailDeficit')}
        </Text>
      ) : null}
      {flags.surplusCapped ? (
        <Text className="text-destructive text-sm">
          {t('account.onboarding.result.guardrailSurplus')}
        </Text>
      ) : null}
      {flags.minimumFloorApplied ? (
        <Text className="text-destructive text-sm">
          {t('account.onboarding.result.guardrailMinimum')}
        </Text>
      ) : null}
    </OnboardingScreen>
  );
}
