import { Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { Card } from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { estimateDurationMin } from '@/domain/trainingPlan';
import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

import { exerciseDisplayName } from '../exercises';
import type { Exercise } from '../types';
import { useSetupRoutineName } from './hooks';
import type { SetupExercise, SetupRoutine } from './setupStore';

function IconButton({
  symbol,
  label,
  onPress,
  tone = 'neutral',
}: {
  symbol: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      preset="subtle"
      haptic="tapLight"
      onPress={onPress}
      className="h-11 w-11 items-center justify-center"
    >
      <SymbolView
        name={symbol}
        size={19}
        tintColor={
          tone === 'danger'
            ? themeColor('danger')
            : themeColor('labelSecondary')
        }
      />
    </PressableScale>
  );
}

/** Editable routine of the setup proposal: name, exercise list (swap/remove), add. */
export function ProposalRoutineCard({
  routine,
  catalogById,
  onRename,
  onSwap,
  onRemove,
  onAdd,
}: {
  routine: SetupRoutine;
  catalogById: ReadonlyMap<string, Exercise>;
  onRename: (name: string) => void;
  onSwap: (exercise: SetupExercise) => void;
  onRemove: (exercise: SetupExercise) => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const routineName = useSetupRoutineName();
  const minutes = estimateDurationMin({
    exercises: routine.exercises.map((ex) => ({
      targetSets: ex.sets,
      timed: ex.durationMin != null,
      durationMin: ex.durationMin,
    })),
  });

  function targetLabel(ex: SetupExercise): string {
    if (ex.durationMin != null) {
      return t('trainingSetup.proposal.targetDuration', {
        minutes: ex.durationMin,
      });
    }
    if (ex.repsMin != null && ex.reps != null && ex.repsMin < ex.reps) {
      return t('trainingSetup.proposal.targetRange', {
        sets: ex.sets,
        min: ex.repsMin,
        max: ex.reps,
      });
    }
    return t('trainingSetup.proposal.target', {
      sets: ex.sets,
      reps: ex.reps ?? '–',
    });
  }

  return (
    <Card className="gap-3">
      <View className="gap-1">
        <TextInput
          value={routine.name ?? routineName(routine)}
          onChangeText={onRename}
          placeholder={
            routine.nameKey
              ? t(routine.nameKey)
              : t('trainingSetup.proposal.untitled')
          }
          accessibilityLabel={t('trainingSetup.proposal.routineName')}
          returnKeyType="done"
          maxLength={40}
          className="text-label py-1"
          style={textStyles.title}
          maxFontSizeMultiplier={1.3}
        />
        <Text className="text-label-secondary" style={textStyles.callout}>
          {t('trainingSetup.proposal.meta', {
            count: routine.exercises.length,
            minutes,
          })}
        </Text>
      </View>

      {routine.exercises.length === 0 ? (
        <Text className="text-label-secondary" style={textStyles.callout}>
          {t('trainingSetup.proposal.empty')}
        </Text>
      ) : (
        <View>
          {routine.exercises.map((ex, index) => {
            const exercise = catalogById.get(ex.exerciseId);
            const name = exercise ? exerciseDisplayName(exercise, t) : '…';
            return (
              <View
                key={ex.key}
                className={`min-h-14 flex-row items-center gap-1 py-1 ${
                  index > 0 ? 'border-line-soft border-t' : ''
                }`}
              >
                <View className="flex-1 gap-0.5 pr-1">
                  <Text
                    className="text-label text-[16px] font-semibold"
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  <Text className="text-label-secondary text-sm tabular-nums">
                    {targetLabel(ex)}
                  </Text>
                </View>
                <IconButton
                  symbol="arrow.triangle.2.circlepath"
                  label={`${t('trainingSetup.proposal.swap')}: ${name}`}
                  onPress={() => onSwap(ex)}
                />
                <IconButton
                  symbol="minus.circle"
                  tone="danger"
                  label={`${t('trainingSetup.proposal.remove')}: ${name}`}
                  onPress={() => onRemove(ex)}
                />
              </View>
            );
          })}
        </View>
      )}

      <PressableScale
        accessibilityRole="button"
        preset="subtle"
        onPress={onAdd}
        className="min-h-11 flex-row items-center gap-2"
      >
        <SymbolView
          name="plus.circle.fill"
          size={20}
          tintColor={themeColor('accent')}
        />
        <Text className="text-tint text-[16px] font-semibold">
          {t('trainingSetup.proposal.addExercise')}
        </Text>
      </PressableScale>
    </Card>
  );
}
