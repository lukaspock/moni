import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { themeColor } from '@/theme/colors';

import {
  exerciseDisplayName,
  openExercisePicker,
  useExerciseCatalog,
  useExercisePickerStore,
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
    existing?.exercises.map((e) => ({ exerciseId: e.exerciseId, targetSets: e.targetSets, targetReps: e.targetReps })) ?? [],
  );

  const catalogById = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);

  const resultVersion = useExercisePickerStore((s) => s.resultVersion);
  const lastHandledVersion = useRef(resultVersion);
  useEffect(() => {
    if (resultVersion === lastHandledVersion.current) return;
    lastHandledVersion.current = resultVersion;
    const selectedIds = useExercisePickerStore.getState().selectedIds;
    setExercises((prev) => {
      const existingIds = new Set(prev.map((e) => e.exerciseId));
      const added = selectedIds
        .filter((id2) => !existingIds.has(id2))
        .map((exerciseId) => ({ exerciseId, targetSets: 3, targetReps: 10 }));
      return [...prev, ...added];
    });
  }, [resultVersion]);

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
    setExercises((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) return;
    await saveRoutine({ id, name: name.trim(), exercises });
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-system-background" contentContainerClassName="gap-4 p-4">
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('workout.routine.namePlaceholder')}
        placeholderTextColor="gray"
        className="rounded-xl bg-secondary-system-background px-4 py-3 text-base text-label"
      />

      <Text className="text-sm font-semibold uppercase text-secondary-label">{t('workout.routine.exercises')}</Text>
      {exercises.length === 0 && <Text className="text-sm text-secondary-label">{t('workout.routine.empty')}</Text>}

      {exercises.map((ex, index) => {
        const exercise = catalogById.get(ex.exerciseId);
        return (
          <View key={ex.exerciseId} className="rounded-xl bg-secondary-system-background p-3">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="flex-1 text-base text-label">{exercise ? exerciseDisplayName(exercise, t) : '…'}</Text>
              <Pressable onPress={() => move(index, -1)} className="px-1">
                <SymbolView name="chevron.up" size={14} tintColor="secondaryLabel" />
              </Pressable>
              <Pressable onPress={() => move(index, 1)} className="px-1">
                <SymbolView name="chevron.down" size={14} tintColor="secondaryLabel" />
              </Pressable>
              <Pressable onPress={() => removeExercise(index)} className="px-1">
                <SymbolView name="trash" size={14} tintColor={themeColor('danger')} />
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
        );
      })}

      <Pressable
        onPress={() => {
          openExercisePicker(
            'multi',
            exercises.map((e) => e.exerciseId),
          );
          router.push('/exercise-picker');
        }}
        className="flex-row items-center justify-center gap-2 rounded-xl bg-secondary-system-background py-3"
      >
        <SymbolView name="plus" size={16} />
        <Text className="text-base text-label">{t('workout.routine.addExercise')}</Text>
      </Pressable>

      <Pressable
        disabled={!name.trim()}
        onPress={handleSave}
        className={`mt-2 items-center rounded-xl py-3.5 ${name.trim() ? 'bg-tint' : 'bg-secondary-system-background'}`}
      >
        <Text className="text-base font-semibold text-white">{t('workout.routine.save')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <View className="flex-1">
      <Text className="mb-1 text-[11px] text-secondary-label">{label}</Text>
      <TextInput
        value={value !== null ? String(value) : ''}
        onChangeText={(text) => onChange(text === '' ? null : Number(text))}
        keyboardType="number-pad"
        className="rounded-lg bg-system-background px-3 py-1.5 text-center text-base text-label"
      />
    </View>
  );
}
