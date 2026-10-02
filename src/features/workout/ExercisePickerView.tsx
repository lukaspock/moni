import { useMemo, useState, type ReactNode } from 'react';
import {
  PlatformColor,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SymbolView } from 'expo-symbols';
import { themeColor } from '@/theme/colors';

import {
  allMuscleGroups,
  createCustomExercise,
  exerciseDisplayName,
  filterExercises,
  useExerciseCatalog,
} from './exercises';
import { getRecentExerciseIds, rememberExercises } from './recentExercises';
import type { ExercisePickerMode } from './pickerStore';
import type { Exercise, ExerciseCategory, TrackingType } from './types';
import { GlassActionButton, SectionHeader } from '@/components/ui';
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

/**
 * Picker body (title, search, chips, list, confirm). Rendered by the
 * `exercise-picker` route (active workout) and inline inside the routine
 * editor sheet (a formSheet stacked over a formSheet rendered blank on device).
 */
export function ExercisePickerView({
  mode,
  initialSelectedIds,
  onConfirm,
  onClose,
}: {
  mode: ExercisePickerMode;
  initialSelectedIds: string[];
  onConfirm: (ids: string[]) => void;
  /** Shows a back chevron (inline usage only). */
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const { userId } = useSession();
  const { exercises, isLoading, refresh } = useExerciseCatalog();

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
      rememberExercises([exercise.id]);
      onConfirm([exercise.id]);
      return;
    }
    setSelectedIds((ids) =>
      ids.includes(exercise.id)
        ? ids.filter((i) => i !== exercise.id)
        : [...ids, exercise.id],
    );
  }

  function handleConfirm() {
    rememberExercises(selectedIds);
    onConfirm(selectedIds);
  }

  const hasFilter =
    query.trim().length > 0 || category !== 'all' || muscleGroup !== null;
  const recents = useMemo(() => {
    const byId = new Map(exercises.map((e) => [e.id, e]));
    return getRecentExerciseIds()
      .map((id) => byId.get(id))
      .filter((e): e is Exercise => !!e);
  }, [exercises]);
  const list = hasFilter ? filtered : recents;
  const canConfirm = selectedIds.length > 0;

  function muscleLabel(mg: string): string {
    const known = muscleLabels(t)[mg];
    return known ?? mg.replace(/_/g, ' ');
  }

  function renderRow(item: Exercise, last: boolean) {
    const selected = selectedIds.includes(item.id);
    return (
      <View key={item.id}>
        <Pressable
          onPress={() => toggle(item)}
          className="flex-row items-center justify-between px-4 py-3"
        >
          <View className="flex-1 pr-2">
            <Text className="text-label text-base">
              {exerciseDisplayName(item, t)}
            </Text>
            {item.muscleGroups.length > 0 && (
              <Text className="text-secondary-label text-xs">
                {item.muscleGroups.map(muscleLabel).join(', ')}
              </Text>
            )}
          </View>
          {mode === 'multi' && (
            <SymbolView
              name={selected ? 'checkmark.circle.fill' : 'circle'}
              size={22}
              tintColor={
                selected
                  ? themeColor('accent')
                  : PlatformColor('secondaryLabel')
              }
            />
          )}
        </Pressable>
        {!last && <View className="bg-separator mx-4 h-px" />}
      </View>
    );
  }

  return (
    <View className="bg-system-background flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-5 pt-6"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View className="items-center justify-center">
          <Text className="text-label text-center text-lg font-semibold">
            {t('workout.exercisePicker.title')}
          </Text>
          {onClose && (
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel={t('workout.exercisePicker.back')}
              className="absolute left-0"
            >
              <SymbolView
                name="chevron.left"
                size={18}
                tintColor={themeColor('accent')}
              />
            </Pressable>
          )}
        </View>
        <View className="bg-secondary-system-background flex-row items-center gap-2 rounded-xl px-3 py-2.5">
          <SymbolView
            name="magnifyingglass"
            size={16}
            tintColor={PlatformColor('secondaryLabel')}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('workout.exercisePicker.searchPlaceholder')}
            placeholderTextColor="gray"
            autoCorrect={false}
            className="text-label flex-1 text-base"
          />
        </View>

        <View className="gap-2">
          <ChipRow>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                selected={category === c}
                onPress={() => setCategory(c)}
                label={
                  c === 'all'
                    ? t('workout.exercisePicker.categoryAll')
                    : t(`workout.category.${c}`)
                }
              />
            ))}
          </ChipRow>
          {muscleGroups.length > 0 && (
            <ChipRow>
              <Chip
                small
                selected={muscleGroup === null}
                onPress={() => setMuscleGroup(null)}
                label={t('workout.exercisePicker.muscleGroupAll')}
              />
              {muscleGroups.map((mg) => (
                <Chip
                  key={mg}
                  small
                  selected={muscleGroup === mg}
                  onPress={() => setMuscleGroup(mg)}
                  label={muscleLabel(mg)}
                />
              ))}
            </ChipRow>
          )}
        </View>

        {!hasFilter && recents.length > 0 && (
          <SectionHeader title={t('workout.exercisePicker.recent')} />
        )}
        {list.length > 0 ? (
          <View className="bg-secondary-system-background overflow-hidden rounded-2xl">
            {list.map((e, i) => renderRow(e, i === list.length - 1))}
          </View>
        ) : (
          !isLoading && (
            <Text className="text-secondary-label mt-6 text-center text-sm">
              {t(
                hasFilter
                  ? 'workout.exercisePicker.noResults'
                  : 'workout.exercisePicker.hint',
              )}
            </Text>
          )
        )}

        <Pressable
          onPress={() => setShowCreate((v) => !v)}
          className="flex-row items-center justify-center gap-2 py-2"
        >
          <SymbolView
            name="plus.circle"
            size={20}
            tintColor={themeColor('accent')}
          />
          <Text className="text-tint text-base">
            {t('workout.exercisePicker.createCustom')}
          </Text>
        </Pressable>
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
      </ScrollView>

      {mode === 'multi' && canConfirm && (
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

function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      className="-mx-5 grow-0"
      contentContainerClassName="gap-2 px-5"
    >
      {children}
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
  small,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 ${small ? 'py-1' : 'py-1.5'} ${selected ? 'bg-tint' : 'bg-secondary-system-background'}`}
    >
      <Text
        className={`${small ? 'text-xs' : 'text-sm'} ${selected ? 'font-semibold text-white' : small ? 'text-secondary-label' : 'text-label'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function muscleLabels(t: (key: never) => string): Record<string, string> {
  const tt = t as unknown as (key: string) => string;
  return {
    abductors: tt('workout.muscle.abductors'),
    adductors: tt('workout.muscle.adductors'),
    back: tt('workout.muscle.back'),
    biceps: tt('workout.muscle.biceps'),
    calves: tt('workout.muscle.calves'),
    cardio: tt('workout.muscle.cardio'),
    chest: tt('workout.muscle.chest'),
    core: tt('workout.muscle.core'),
    forearms: tt('workout.muscle.forearms'),
    full_body: tt('workout.muscle.full_body'),
    glutes: tt('workout.muscle.glutes'),
    hamstrings: tt('workout.muscle.hamstrings'),
    quadriceps: tt('workout.muscle.quadriceps'),
    shoulders: tt('workout.muscle.shoulders'),
    triceps: tt('workout.muscle.triceps'),
  };
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
