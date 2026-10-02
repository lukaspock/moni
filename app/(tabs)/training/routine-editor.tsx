import { Fragment, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { themeColor } from '@/theme/colors';

import { GlassActionButton, SectionHeader, SheetScreen } from '@/components/ui';
import {
  exerciseDisplayName,
  useExerciseCatalog,
  ExercisePickerView,
  useRoutines,
  useSaveRoutine,
  type Routine,
  type RoutineExerciseInput,
} from '@/features/workout';

export default function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { routines, isLoading } = useRoutines();

  // Wait for the existing routine to load before mounting the form, so its
  // local draft state can be seeded directly from `existing` at mount time
  // instead of being synchronized in afterwards via an effect.
  if (id && isLoading) return null;

  const existing = routines.find((r) => r.id === id);
  return <RoutineForm id={id} existing={existing} />;
}

function RoutineForm({ id, existing }: { id?: string; existing?: Routine }) {
  const { t } = useTranslation();
  const { exercises: catalog } = useExerciseCatalog();
  const saveRoutine = useSaveRoutine();

  const [name, setName] = useState(existing?.name ?? '');
  const [exercises, setExercises] = useState<RoutineExerciseInput[]>(
    existing?.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
    })) ?? [],
  );

  const catalogById = useMemo(
    () => new Map(catalog.map((e) => [e.id, e])),
    [catalog],
  );

  const [picking, setPicking] = useState(false);

  function addExercises(selectedIds: string[]) {
    setExercises((prev) => {
      const existingIds = new Set(prev.map((e) => e.exerciseId));
      const added = selectedIds
        .filter((id2) => !existingIds.has(id2))
        .map((exerciseId) => ({ exerciseId, targetSets: 3, targetReps: 10 }));
      return [...prev, ...added];
    });
    setPicking(false);
  }

  function move(index: number, dir: -1 | 1) {
    setExercises((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateExercise(index: number, patch: Partial<RoutineExerciseInput>) {
    setExercises((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    );
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) return;
    await saveRoutine({ id, name: name.trim(), exercises });
    router.back();
  }

  // The picker renders inline (a formSheet stacked on this formSheet showed an
  // empty sheet on device); local draft state survives because we stay mounted.
  if (picking) {
    return (
      <ExercisePickerView
        mode="multi"
        initialSelectedIds={exercises.map((e) => e.exerciseId)}
        onConfirm={addExercises}
        onClose={() => setPicking(false)}
      />
    );
  }

  return (
    <SheetScreen title={t('workout.routine.title')}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('workout.routine.namePlaceholder')}
        placeholderTextColor="gray"
        className="bg-secondary-system-background text-label rounded-2xl px-4 py-4 text-base"
      />

      <View className="gap-2">
        <SectionHeader title={t('workout.routine.exercises')} />
        {exercises.length === 0 && (
          <Text className="text-secondary-label px-1 text-sm">
            {t('workout.routine.empty')}
          </Text>
        )}

        <View className="bg-secondary-system-background overflow-hidden rounded-2xl">
          {exercises.map((ex, index) => {
            const exercise = catalogById.get(ex.exerciseId);
            return (
              <Fragment key={ex.exerciseId}>
                <View className="gap-3 p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-label flex-1 text-base font-semibold">
                      {exercise ? exerciseDisplayName(exercise, t) : '…'}
                    </Text>
                    <Pressable
                      accessibilityLabel={t('workout.routine.moveUp')}
                      onPress={() => move(index, -1)}
                      hitSlop={8}
                      className="px-2"
                    >
                      <SymbolView
                        name="chevron.up"
                        size={14}
                        tintColor="secondaryLabel"
                      />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={t('workout.routine.moveDown')}
                      onPress={() => move(index, 1)}
                      hitSlop={8}
                      className="px-2"
                    >
                      <SymbolView
                        name="chevron.down"
                        size={14}
                        tintColor="secondaryLabel"
                      />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={t('workout.routine.remove')}
                      onPress={() => removeExercise(index)}
                      hitSlop={8}
                      className="pl-2"
                    >
                      <SymbolView
                        name="trash"
                        size={15}
                        tintColor={themeColor('danger')}
                      />
                    </Pressable>
                  </View>
                  <View className="flex-row gap-3">
                    <NumberField
                      label={t('workout.routine.targetSets')}
                      value={ex.targetSets}
                      onChange={(v) => updateExercise(index, { targetSets: v })}
                    />
                    <NumberField
                      label={t('workout.routine.targetReps')}
                      value={ex.targetReps}
                      onChange={(v) => updateExercise(index, { targetReps: v })}
                    />
                  </View>
                </View>
                <View className="bg-separator mx-4 h-px" />
              </Fragment>
            );
          })}

          <Pressable
            onPress={() => setPicking(true)}
            className="flex-row items-center gap-2 px-4 py-4"
          >
            <SymbolView
              name="plus.circle.fill"
              size={20}
              tintColor={themeColor('accent')}
            />
            <Text className="text-tint text-base font-semibold">
              {t('workout.routine.addExercise')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={{ opacity: name.trim() ? 1 : 0.4 }}>
        <GlassActionButton
          label={t('workout.routine.save')}
          symbol="checkmark"
          onPress={() => {
            if (name.trim()) void handleSave();
          }}
        />
      </View>
    </SheetScreen>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <View className="flex-1">
      <Text className="text-secondary-label mb-1 text-[11px]">{label}</Text>
      <TextInput
        value={value !== null ? String(value) : ''}
        onChangeText={(text) => onChange(text === '' ? null : Number(text))}
        keyboardType="number-pad"
        className="bg-system-background text-label rounded-xl px-3 py-2.5 text-center text-base"
      />
    </View>
  );
}
