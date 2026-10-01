import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { themeColor } from '@/theme/colors';

import {
  allMuscleGroups,
  createCustomExercise,
  exerciseDisplayName,
  filterExercises,
  useExerciseCatalog,
  useExercisePickerStore,
  type Exercise,
  type ExerciseCategory,
  type TrackingType,
} from '@/features/workout';
import { GlassActionButton } from '@/components/ui';
import { useSession } from '@/features/auth';

const CATEGORIES: (ExerciseCategory | 'all')[] = [
  'all',
  'strength',
  'cardio',
  'sport',
  'other',
];
const TRACKING_TYPES: TrackingType[] = [
  'weight_reps',
  'reps',
  'duration',
  'distance_duration',
];
const TRACKING_LABEL_KEYS = {
  weight_reps: 'workout.exercisePicker.trackingWeightReps',
  reps: 'workout.exercisePicker.trackingReps',
  duration: 'workout.exercisePicker.trackingDuration',
  distance_duration: 'workout.exercisePicker.trackingDistanceDuration',
} as const;

export default function ExercisePickerScreen() {
  const { t } = useTranslation();
  const { userId } = useSession();
  const { exercises, isLoading, refresh } = useExerciseCatalog();
  const mode = useExercisePickerStore((s) => s.mode);
  const initialSelectedIds = useExercisePickerStore(
    (s) => s.initialSelectedIds,
  );
  const confirm = useExercisePickerStore((s) => s.confirm);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [showCreate, setShowCreate] = useState(false);

  const muscleGroups = useMemo(() => allMuscleGroups(exercises), [exercises]);
  const filtered = useMemo(
    () => filterExercises(exercises, query, category, muscleGroup, t),
    [exercises, query, category, muscleGroup, t],
  );

  function toggle(exercise: Exercise) {
    if (mode === 'single') {
      confirm([exercise.id]);
      router.back();
      return;
    }
    setSelectedIds((ids) =>
      ids.includes(exercise.id)
        ? ids.filter((i) => i !== exercise.id)
        : [...ids, exercise.id],
    );
  }

  function handleConfirm() {
    confirm(selectedIds);
    router.back();
  }

  return (
    <View className="bg-system-background flex-1 pt-6">
      <View className="px-5">
        <Text className="text-label mb-3 text-center text-lg font-semibold">
          {t('workout.exercisePicker.title')}
        </Text>
        <View className="bg-secondary-system-background mb-3 flex-row items-center gap-2 rounded-xl px-3 py-2">
          <SymbolView
            name="magnifyingglass"
            size={16}
            tintColor="secondaryLabel"
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('workout.exercisePicker.searchPlaceholder')}
            placeholderTextColor="gray"
            className="text-label flex-1 text-base"
          />
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(c) => c}
          contentContainerClassName="gap-2 pb-2"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setCategory(item)}
              className={`rounded-full px-3 py-1.5 ${category === item ? 'bg-tint' : 'bg-secondary-system-background'}`}
            >
              <Text className={category === item ? 'text-white' : 'text-label'}>
                {item === 'all'
                  ? t('workout.exercisePicker.categoryAll')
                  : t(`workout.category.${item}`)}
              </Text>
            </Pressable>
          )}
        />
        {muscleGroups.length > 0 && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[null, ...muscleGroups]}
            keyExtractor={(m) => m ?? 'all'}
            contentContainerClassName="gap-2 pb-2"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setMuscleGroup(item)}
                className={`rounded-full px-3 py-1 ${muscleGroup === item ? 'bg-tint' : 'bg-secondary-system-background'}`}
              >
                <Text
                  className={`text-xs ${muscleGroup === item ? 'text-white' : 'text-secondary-label'}`}
                >
                  {item ?? t('workout.exercisePicker.muscleGroupAll')}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerClassName="px-5 pb-4"
        ListEmptyComponent={
          !isLoading ? (
            <Text className="text-secondary-label mt-8 text-center">
              {t('workout.exercisePicker.noResults')}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.id);
          return (
            <Pressable
              onPress={() => toggle(item)}
              className="border-separator flex-row items-center justify-between border-b py-3"
            >
              <View className="flex-1 pr-2">
                <Text className="text-label text-base">
                  {exerciseDisplayName(item, t)}
                </Text>
                {item.muscleGroups.length > 0 && (
                  <Text className="text-secondary-label text-xs">
                    {item.muscleGroups.join(', ')}
                  </Text>
                )}
              </View>
              {mode === 'multi' && (
                <SymbolView
                  name={selected ? 'checkmark.circle.fill' : 'circle'}
                  size={22}
                  tintColor={selected ? themeColor('accent') : 'secondaryLabel'}
                />
              )}
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Pressable
            onPress={() => setShowCreate((v) => !v)}
            className="mt-2 flex-row items-center gap-2 py-3"
          >
            <SymbolView name="plus.circle" size={20} />
            <Text className="text-tint text-base">
              {t('workout.exercisePicker.createCustom')}
            </Text>
          </Pressable>
        }
      />

      {showCreate && userId && (
        <CreateCustomExerciseForm
          userId={userId}
          onCreated={(exercise) => {
            setShowCreate(false);
            void refresh();
            toggle(exercise);
          }}
        />
      )}

      {mode === 'multi' && (
        <View className="bg-system-background px-5 pb-6 pt-2">
          <GlassActionButton
            label={t('workout.exercisePicker.confirm', {
              count: selectedIds.length,
            })}
            symbol="checkmark"
            onPress={handleConfirm}
          />
        </View>
      )}
    </View>
  );
}

function CreateCustomExerciseForm({
  userId,
  onCreated,
}: {
  userId: string;
  onCreated: (e: Exercise) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('strength');
  const [trackingType, setTrackingType] = useState<TrackingType>('weight_reps');

  return (
    <View className="border-separator bg-secondary-system-background gap-3 border-t px-4 py-4">
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('workout.exercisePicker.customName')}
        placeholderTextColor="gray"
        className="bg-system-background text-label rounded-lg px-3 py-2 text-base"
      />
      <View>
        <Text className="text-secondary-label mb-1 text-xs">
          {t('workout.exercisePicker.customCategory')}
        </Text>
        <View className="flex-row gap-2">
          {(['strength', 'cardio', 'sport', 'other'] as ExerciseCategory[]).map(
            (c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                className={`rounded-full px-3 py-1 ${category === c ? 'bg-tint' : 'bg-system-background'}`}
              >
                <Text className={category === c ? 'text-white' : 'text-label'}>
                  {t(`workout.category.${c}`)}
                </Text>
              </Pressable>
            ),
          )}
        </View>
      </View>
      <View>
        <Text className="text-secondary-label mb-1 text-xs">
          {t('workout.exercisePicker.customTracking')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {TRACKING_TYPES.map((tt) => (
            <Pressable
              key={tt}
              onPress={() => setTrackingType(tt)}
              className={`rounded-full px-3 py-1 ${trackingType === tt ? 'bg-tint' : 'bg-system-background'}`}
            >
              <Text
                className={trackingType === tt ? 'text-white' : 'text-label'}
              >
                {t(TRACKING_LABEL_KEYS[tt])}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable
        disabled={!name.trim()}
        onPress={() => {
          const exercise = createCustomExercise(userId, {
            name: name.trim(),
            category,
            trackingType,
          });
          onCreated(exercise);
        }}
        className={`items-center rounded-xl py-2.5 ${name.trim() ? 'bg-tint' : 'bg-secondary-system-background'}`}
      >
        <Text className="font-semibold text-white">
          {t('workout.exercisePicker.createCustom')}
        </Text>
      </Pressable>
    </View>
  );
}
