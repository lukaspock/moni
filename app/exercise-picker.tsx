import { router } from 'expo-router';

import { ExercisePickerView, useExercisePickerStore } from '@/features/workout';

/** Picker as its own sheet route (used by the active workout). */
export default function ExercisePickerScreen() {
  const mode = useExercisePickerStore((s) => s.mode);
  const initialSelectedIds = useExercisePickerStore(
    (s) => s.initialSelectedIds,
  );
  const confirm = useExercisePickerStore((s) => s.confirm);

  return (
    <ExercisePickerView
      mode={mode}
      initialSelectedIds={initialSelectedIds}
      onConfirm={(ids) => {
        confirm(ids);
        router.back();
      }}
    />
  );
}
