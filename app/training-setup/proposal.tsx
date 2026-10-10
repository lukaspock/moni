import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, Stack, type Href } from 'expo-router';

import { ModalTopBar } from '@/components/ui';
import { Reveal } from '@/components/motion';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { ExercisePickerView, useExerciseCatalog } from '@/features/workout';
import {
  ProposalRoutineCard,
  useSaveTrainingSetup,
  useTrainingSetupStore,
} from '@/features/workout/setup';
import { haptic } from '@/lib/haptics';
import { textStyles } from '@/theme/typography';

type PickerTarget =
  | { kind: 'swap'; routineKey: string; exerciseKey: string; currentId: string }
  | { kind: 'add'; routineKey: string; existingIds: string[] };

/** Step 3: the template proposal — rename, swap, remove, add, then save. */
export default function TrainingSetupProposalScreen() {
  const { t } = useTranslation();
  const { exercises: catalog } = useExerciseCatalog();
  const routines = useTrainingSetupStore((s) => s.routines);
  const proposalFor = useTrainingSetupStore((s) => s.proposalFor);
  const saveAll = useSaveTrainingSetup();

  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const catalogById = useMemo(
    () => new Map(catalog.map((e) => [e.id, e])),
    [catalog],
  );

  // The frequency step builds the proposal; this covers a catalog that was
  // still loading back then (store action, no-op once built).
  useEffect(() => {
    if (catalog.length > 0)
      useTrainingSetupStore.getState().buildProposal(catalog);
  }, [catalog]);

  const totalExercises = routines.reduce(
    (sum, r) => sum + r.exercises.length,
    0,
  );

  async function handleSave() {
    if (savingRef.current) return;
    if (totalExercises === 0) {
      Alert.alert(t('trainingSetup.proposal.nothingToSave'));
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await saveAll();
      router.push('/training-setup/done' as Href);
    } catch (error) {
      console.warn('[training-setup] save failed', error);
      haptic.aiFail();
      Alert.alert(t('trainingSetup.proposal.saveFailed'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handlePicked(ids: string[]) {
    const target = picker;
    setPicker(null);
    if (!target) return;
    const store = useTrainingSetupStore.getState();
    const entries = ids
      .map((id) => catalogById.get(id))
      .filter((e): e is NonNullable<typeof e> => !!e);
    if (target.kind === 'swap') {
      const entry = entries[0];
      if (entry && entry.id !== target.currentId) {
        store.replaceExercise(target.routineKey, target.exerciseKey, entry);
      }
    } else {
      const fresh = entries.filter((e) => !target.existingIds.includes(e.id));
      if (fresh.length > 0) {
        store.addExercises(target.routineKey, fresh);
        haptic.itemAdded();
      }
    }
  }

  // Picker renders inline (like the routine editor): no stacked sheet, the
  // draft stays mounted, the native header is hidden while it is open.
  if (picker) {
    return (
      <View className="bg-bg flex-1">
        <Stack.Screen options={{ headerShown: false }} />
        <ModalTopBar
          title={
            picker.kind === 'swap'
              ? t('trainingSetup.proposal.swapTitle')
              : t('trainingSetup.proposal.addTitle')
          }
          icon="chevron.left"
          label={t('trainingSetup.proposal.back')}
          onPress={() => setPicker(null)}
        />
        <ExercisePickerView
          embedded
          {...(picker.kind === 'swap'
            ? {
                mode: 'single' as const,
                preferMuscleGroup:
                  catalogById.get(picker.currentId)?.muscleGroups[0] ?? null,
                excludeIds: [picker.currentId],
              }
            : { multiSelect: true, alreadyAddedIds: picker.existingIds })}
          onConfirm={handlePicked}
        />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true }} />
      <OnboardingScreen
        title={t('trainingSetup.proposal.title')}
        subtitle={t('trainingSetup.proposal.subtitle')}
        continueLabel={t('trainingSetup.proposal.save')}
        onContinue={() => void handleSave()}
        continueDisabled={totalExercises === 0}
        continueLoading={saving}
        secondaryLabel={t('trainingSetup.buildOwn')}
        onSecondary={() => router.replace('/routine-editor')}
      >
        {proposalFor == null ? (
          <View className="items-center gap-3 py-10">
            <ActivityIndicator />
            <Text className="text-label-secondary" style={textStyles.callout}>
              {t('trainingSetup.proposal.loading')}
            </Text>
          </View>
        ) : (
          routines.map((routine, index) => (
            <Reveal key={routine.key} index={index}>
              <ProposalRoutineCard
                routine={routine}
                catalogById={catalogById}
                onRename={(name) =>
                  useTrainingSetupStore
                    .getState()
                    .renameRoutine(routine.key, name)
                }
                onSwap={(ex) =>
                  setPicker({
                    kind: 'swap',
                    routineKey: routine.key,
                    exerciseKey: ex.key,
                    currentId: ex.exerciseId,
                  })
                }
                onRemove={(ex) =>
                  useTrainingSetupStore
                    .getState()
                    .removeExercise(routine.key, ex.key)
                }
                onAdd={() =>
                  setPicker({
                    kind: 'add',
                    routineKey: routine.key,
                    existingIds: routine.exercises.map((e) => e.exerciseId),
                  })
                }
              />
            </Reveal>
          ))
        )}
      </OnboardingScreen>
    </>
  );
}
