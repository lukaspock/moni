import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import {
  exerciseDisplayName,
  filterExercises,
  logCardioWorkout,
  useExerciseCatalog,
  useLatestWeightKg,
  type Exercise,
  type WorkoutCategory,
} from '@/features/workout';
import { useSession } from '@/features/auth';
import type { CardioIntensity } from '@/domain/met';

const INTENSITIES: CardioIntensity[] = ['light', 'moderate', 'vigorous'];
const INTENSITY_LABEL_KEYS = {
  light: 'workout.cardio.intensityLight',
  moderate: 'workout.cardio.intensityModerate',
  vigorous: 'workout.cardio.intensityVigorous',
} as const;

export default function CardioEntryScreen() {
  const { t } = useTranslation();
  const { userId } = useSession();
  const { weightKg } = useLatestWeightKg();
  const { exercises } = useExerciseCatalog();

  const [category, setCategory] = useState<Exclude<WorkoutCategory, 'strength'>>('cardio');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [duration, setDuration] = useState('30');
  const [distanceKm, setDistanceKm] = useState('');
  const [intensity, setIntensity] = useState<CardioIntensity>('moderate');

  const options = useMemo(
    () => filterExercises(exercises, '', category, null, t).filter((e) => e.category === category),
    [exercises, category, t],
  );

  function handleSave() {
    if (!userId) return;
    const durationMinutes = Number(duration);
    if (!durationMinutes || durationMinutes <= 0) return;
    const result = logCardioWorkout({
      userId,
      exercise: selectedExercise,
      category,
      intensity,
      durationMinutes,
      distanceM: distanceKm ? Number(distanceKm) * 1000 : null,
      weightKg: weightKg ?? 75,
    });
    Alert.alert('', t('workout.cardio.saved', { kcal: result.kcalBurned }));
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-system-background" contentContainerClassName="gap-4 p-4">
      <View className="flex-row gap-2">
        {(['cardio', 'sport'] as const).map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              setCategory(c);
              setSelectedExercise(null);
            }}
            className={`flex-1 items-center rounded-xl py-2.5 ${category === c ? 'bg-tint' : 'bg-secondary-system-background'}`}
          >
            <Text className={category === c ? 'text-white' : 'text-label'}>{t(`workout.category.${c}`)}</Text>
          </Pressable>
        ))}
      </View>

      <Text className="text-sm font-semibold uppercase text-secondary-label">{t('workout.cardio.exercise')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {options.map((exercise) => (
          <Pressable
            key={exercise.id}
            onPress={() => setSelectedExercise((cur) => (cur?.id === exercise.id ? null : exercise))}
            className={`rounded-full px-3 py-1.5 ${selectedExercise?.id === exercise.id ? 'bg-tint' : 'bg-secondary-system-background'}`}
          >
            <Text className={selectedExercise?.id === exercise.id ? 'text-white' : 'text-label'}>
              {exerciseDisplayName(exercise, t)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Field label={t('workout.cardio.duration')}>
        <TextInput
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          className="rounded-lg bg-secondary-system-background px-3 py-2 text-base text-label"
        />
      </Field>

      <Field label={t('workout.cardio.distance')}>
        <TextInput
          value={distanceKm}
          onChangeText={setDistanceKm}
          keyboardType="decimal-pad"
          placeholder="-"
          placeholderTextColor="gray"
          className="rounded-lg bg-secondary-system-background px-3 py-2 text-base text-label"
        />
      </Field>

      {!selectedExercise && (
        <View>
          <Text className="mb-1 text-sm font-semibold uppercase text-secondary-label">{t('workout.cardio.intensity')}</Text>
          <View className="flex-row gap-2">
            {INTENSITIES.map((i) => (
              <Pressable
                key={i}
                onPress={() => setIntensity(i)}
                className={`flex-1 items-center rounded-xl py-2 ${intensity === i ? 'bg-tint' : 'bg-secondary-system-background'}`}
              >
                <Text className={intensity === i ? 'text-white' : 'text-label'}>{t(INTENSITY_LABEL_KEYS[i])}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Pressable onPress={handleSave} className="mt-2 items-center rounded-xl bg-tint py-3.5">
        <Text className="text-base font-semibold text-white">{t('workout.cardio.save')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-1 text-sm font-semibold uppercase text-secondary-label">{label}</Text>
      {children}
    </View>
  );
}
