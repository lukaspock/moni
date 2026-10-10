import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  SectionList,
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
  useExerciseCatalog,
} from './exercises';
import { getRecentExerciseIds, rememberExercises } from './recentExercises';
import type { ExercisePickerMode } from './pickerStore';
import type { Exercise, ExerciseCategory, TrackingType } from './types';
import { buildPickerSections, orderMuscleGroups } from './editor/pickerLogic';
import { Chip, GlassActionButton, SectionHeader } from '@/components/ui';
import { CheckDraw } from '@/components/motion';
import { useSession } from '@/features/auth';
import { haptic } from '@/lib/haptics';

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

export interface ExercisePickerViewProps {
  /**
   * Legacy selection mode. `single`: a tap picks and confirms right away.
   * `multi`: checkmarks, confirm returns **every** checked id incl. the
   * pre-checked `initialSelectedIds`. Default `single` (ignored when `multiSelect`).
   */
  mode?: ExercisePickerMode;
  /**
   * Add-mode multi select: confirm ("Add 3") returns only the **newly** picked
   * ids. Combine with `alreadyAddedIds` to mark exercises the caller has already.
   */
  multiSelect?: boolean;
  /** Pre-checked ids (legacy `multi`, and `multiSelect`). */
  initialSelectedIds?: string[];
  onConfirm: (ids: string[]) => void;
  /** Inline usage: the host screen provides the header (title + back), so the title row is hidden. */
  embedded?: boolean;
  /** Muscle chip selected on open (e.g. the swapped exercise's main muscle). */
  preferMuscleGroup?: string | null;
  /** Shown as "already in", not selectable (`multiSelect` / `single`). */
  alreadyAddedIds?: string[];
  /** Hidden entirely (e.g. the exercise being swapped out). */
  excludeIds?: string[];
}

type Row = { exercise: Exercise };
type Section = { key: string; title: string; data: Row[] };

/**
 * Exercise picker (training revamp §4): search (no autofocus), muscle chips,
 * Recent / Popular / A–Z sections, multi-select with CheckDraw + "Add N",
 * single mode for swapping, own exercise at the end. Rendered inline by the
 * routine editor and the active workout (a formSheet stacked on a formSheet
 * rendered blank on device).
 */
export function ExercisePickerView({
  mode,
  multiSelect = false,
  initialSelectedIds = [],
  onConfirm,
  embedded = false,
  preferMuscleGroup = null,
  alreadyAddedIds,
  excludeIds,
}: ExercisePickerViewProps) {
  const { t } = useTranslation();
  const { userId } = useSession();
  const { exercises, isLoading, refresh } = useExerciseCatalog();
  const isMulti = multiSelect || mode === 'multi';

  const [query, setQuery] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string | null>(
    preferMuscleGroup,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [showCreate, setShowCreate] = useState(false);
  const [recentIds] = useState(getRecentExerciseIds);

  const added = useMemo(
    () => new Set(alreadyAddedIds ?? []),
    [alreadyAddedIds],
  );
  const muscleGroups = useMemo(
    () => orderMuscleGroups(allMuscleGroups(exercises)),
    [exercises],
  );
  const muscleLabel = useMemo(() => {
    const known = muscleLabels(t);
    return (mg: string) => known[mg] ?? mg.replace(/_/g, ' ');
  }, [t]);
  const equipmentLabel = useMemo(() => {
    const known = equipmentLabels(t);
    return (eq: string | null) => (eq ? (known[eq] ?? null) : null);
  }, [t]);

  const sections = useMemo<Section[]>(() => {
    const s = buildPickerSections({
      exercises,
      recentIds,
      query,
      muscleGroup,
      nameOf: (e) => exerciseDisplayName(e, t),
      excludeIds,
    });
    const toRows = (list: Exercise[]) => list.map((exercise) => ({ exercise }));
    const out: Section[] = [];
    if (s.recent.length)
      out.push({
        key: 'recent',
        title: t('routineEditor.picker.recent'),
        data: toRows(s.recent),
      });
    if (s.popular.length)
      out.push({
        key: 'popular',
        title: t('routineEditor.picker.popular'),
        data: toRows(s.popular),
      });
    if (s.all.length)
      out.push({
        key: 'all',
        title: s.filtered
          ? t('routineEditor.picker.results')
          : t('routineEditor.picker.az'),
        data: toRows(s.all),
      });
    return out;
  }, [exercises, recentIds, query, muscleGroup, t, excludeIds]);

  function toggle(exercise: Exercise) {
    if (added.has(exercise.id)) return;
    if (!isMulti) {
      haptic.select();
      rememberExercises([exercise.id]);
      onConfirm([exercise.id]);
      return;
    }
    haptic.select();
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

  const canConfirm = selectedIds.length > 0;
  const confirmLabel = multiSelect
    ? t('routineEditor.picker.addCount', { count: selectedIds.length })
    : t('workout.exercisePicker.confirm', { count: selectedIds.length });

  function renderRow(item: Exercise, index: number, count: number) {
    const selected = selectedIds.includes(item.id);
    const isAdded = added.has(item.id);
    const first = index === 0;
    const last = index === count - 1;
    const name = exerciseDisplayName(item, t);
    const meta = [
      item.muscleGroups[0] ? muscleLabel(item.muscleGroups[0]) : null,
      equipmentLabel(item.equipment),
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <View
        className={`bg-surface mx-5 overflow-hidden ${first ? 'rounded-t-card' : ''} ${
          last ? 'rounded-b-card' : ''
        }`}
        style={{ borderCurve: 'continuous' }}
      >
        <Pressable
          onPress={() => toggle(item)}
          disabled={isAdded}
          accessibilityRole={isMulti ? 'checkbox' : 'button'}
          accessibilityLabel={meta ? `${name}, ${meta}` : name}
          accessibilityState={
            isMulti ? { checked: selected || isAdded, disabled: isAdded } : {}
          }
          className="min-h-[56px] flex-row items-center gap-3 px-4 py-2.5 active:opacity-70"
        >
          <View className="flex-1">
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
              className={`text-base ${isAdded ? 'text-label-tertiary' : 'text-label'}`}
            >
              {name}
            </Text>
            {meta ? (
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.4}
                className="text-label-tertiary text-xs"
              >
                {meta}
              </Text>
            ) : null}
          </View>
          {isAdded ? (
            <Text className="text-label-tertiary text-xs">
              {t('routineEditor.picker.inRoutine')}
            </Text>
          ) : isMulti ? (
            <CheckDraw checked={selected} size={26} />
          ) : null}
        </Pressable>
        {!last && <View className="bg-line ml-4 h-px" />}
      </View>
    );
  }

  const header = (
    <View className="gap-3 pb-3 pt-4">
      {!embedded && (
        <Text className="text-label text-center text-lg font-semibold">
          {t('workout.exercisePicker.title')}
        </Text>
      )}
      <View className="bg-surface mx-5 flex-row items-center gap-2 rounded-xl px-3 py-2.5">
        <SymbolView
          name="magnifyingglass"
          size={16}
          tintColor={themeColor('labelSecondary')}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('routineEditor.picker.search')}
          placeholderTextColor={themeColor('labelTertiary')}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          accessibilityLabel={t('routineEditor.picker.search')}
          className="text-label flex-1 text-base"
        />
      </View>
      {muscleGroups.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          className="grow-0"
          contentContainerClassName="gap-2 px-5"
        >
          <Chip
            label={t('routineEditor.picker.allMuscles')}
            selected={muscleGroup === null}
            onPress={() => setMuscleGroup(null)}
          />
          {muscleGroups.map((mg) => (
            <Chip
              key={mg}
              label={muscleLabel(mg)}
              selected={muscleGroup === mg}
              onPress={() => setMuscleGroup(muscleGroup === mg ? null : mg)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  const footer = (
    <View className="gap-3 px-5 pb-10 pt-4">
      {sections.length === 0 && !isLoading && (
        <Text className="text-label-secondary text-center text-sm">
          {t('routineEditor.picker.noResults')}
        </Text>
      )}
      <Pressable
        onPress={() => setShowCreate((v) => !v)}
        accessibilityRole="button"
        className="min-h-[44px] flex-row items-center justify-center gap-2"
      >
        <SymbolView
          name="plus.circle"
          size={20}
          tintColor={themeColor('accent')}
        />
        <Text className="text-tint text-base">
          {t('routineEditor.picker.createCustom')}
        </Text>
      </Pressable>
      {showCreate && userId && (
        <CreateCustomExerciseForm
          userId={userId}
          initialName={query.trim()}
          onCreated={(exercise) => {
            setShowCreate(false);
            void refresh();
            toggle(exercise);
          }}
        />
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView behavior="padding" className="bg-bg flex-1">
      {header}
      <SectionList
        className="flex-1"
        sections={sections}
        keyExtractor={(row, index) => `${row.exercise.id}-${index}`}
        renderItem={({ item, index, section }) =>
          renderRow(item.exercise, index, section.data.length)
        }
        renderSectionHeader={({ section }) => (
          <View className="bg-bg px-5 pb-2 pt-4">
            <SectionHeader title={section.title} />
          </View>
        )}
        stickySectionHeadersEnabled={false}
        ListFooterComponent={footer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        initialNumToRender={20}
      />

      {isMulti && canConfirm && (
        <View className="bg-bg px-5 pb-6 pt-2">
          <GlassActionButton
            label={confirmLabel}
            symbol={multiSelect ? 'plus' : 'checkmark'}
            onPress={handleConfirm}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/** Translated muscle names (dynamic catalog values -> literal keys). */
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

function equipmentLabels(t: (key: never) => string): Record<string, string> {
  const tt = t as unknown as (key: string) => string;
  return {
    barbell: tt('routineEditor.picker.equipment.barbell'),
    dumbbell: tt('routineEditor.picker.equipment.dumbbell'),
    machine: tt('routineEditor.picker.equipment.machine'),
    cable: tt('routineEditor.picker.equipment.cable'),
    bodyweight: tt('routineEditor.picker.equipment.bodyweight'),
    kettlebell: tt('routineEditor.picker.equipment.kettlebell'),
    medicine_ball: tt('routineEditor.picker.equipment.medicine_ball'),
    other: tt('routineEditor.picker.equipment.other'),
  };
}

const CUSTOM_CATEGORIES: ExerciseCategory[] = [
  'strength',
  'cardio',
  'sport',
  'other',
];

function CreateCustomExerciseForm({
  userId,
  initialName,
  onCreated,
}: {
  userId: string;
  initialName: string;
  onCreated: (e: Exercise) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<ExerciseCategory>('strength');
  const [trackingType, setTrackingType] = useState<TrackingType>('weight_reps');
  const categoryLabel: Record<ExerciseCategory, string> = {
    strength: t('workout.category.strength'),
    cardio: t('workout.category.cardio'),
    sport: t('workout.category.sport'),
    other: t('workout.category.other'),
  };

  return (
    <View
      className="bg-surface gap-4 rounded-card p-4"
      style={{ borderCurve: 'continuous' }}
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('workout.exercisePicker.customName')}
        placeholderTextColor={themeColor('labelTertiary')}
        className="bg-bg text-label rounded-inner px-3 py-3 text-base"
      />
      <View className="gap-2">
        <Text className="text-label-secondary text-xs">
          {t('workout.exercisePicker.customCategory')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {CUSTOM_CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={categoryLabel[c]}
              selected={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </View>
      </View>
      <View className="gap-2">
        <Text className="text-label-secondary text-xs">
          {t('workout.exercisePicker.customTracking')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {TRACKING_TYPES.map((tt) => (
            <Chip
              key={tt}
              label={t(TRACKING_LABEL_KEYS[tt])}
              selected={trackingType === tt}
              onPress={() => setTrackingType(tt)}
            />
          ))}
        </View>
      </View>
      <Pressable
        disabled={!name.trim()}
        accessibilityRole="button"
        accessibilityState={{ disabled: !name.trim() }}
        onPress={() => {
          const exercise = createCustomExercise(userId, {
            name: name.trim(),
            category,
            trackingType,
          });
          haptic.itemAdded();
          onCreated(exercise);
        }}
        className={`min-h-[44px] items-center justify-center rounded-inner py-2.5 ${
          name.trim() ? 'bg-tint' : 'bg-surface-raised'
        }`}
      >
        <Text
          className={`font-semibold ${name.trim() ? 'text-on-tint' : 'text-label-tertiary'}`}
        >
          {t('routineEditor.picker.createCustom')}
        </Text>
      </Pressable>
    </View>
  );
}
