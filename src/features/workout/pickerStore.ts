/**
 * Exercise-picker selection, handed back to the caller via Zustand instead of
 * URL params (formSheet route `app/exercise-picker.tsx`).
 *
 * Flow: caller sets `mode`/`initialSelectedIds` via `openExercisePicker(...)`,
 * pushes the route, the picker writes `selectedIds` + bumps `resultVersion`
 * on confirm, then pops. The caller watches `resultVersion` (or just reads
 * `selectedIds` after `router.back()` resolves) to consume the result.
 */
import { create } from 'zustand';

export type ExercisePickerMode = 'single' | 'multi';

interface ExercisePickerState {
  mode: ExercisePickerMode;
  initialSelectedIds: string[];
  selectedIds: string[];
  /** increments every time the picker confirms a selection, so a caller with a stale closure can detect a new result */
  resultVersion: number;
  open: (opts: { mode: ExercisePickerMode; initialSelectedIds?: string[] }) => void;
  setSelectedIds: (ids: string[]) => void;
  confirm: (ids: string[]) => void;
}

export const useExercisePickerStore = create<ExercisePickerState>((set) => ({
  mode: 'multi',
  initialSelectedIds: [],
  selectedIds: [],
  resultVersion: 0,
  open: ({ mode, initialSelectedIds = [] }) =>
    set({ mode, initialSelectedIds, selectedIds: initialSelectedIds }),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  confirm: (ids) => set((s) => ({ selectedIds: ids, resultVersion: s.resultVersion + 1 })),
}));

/** Convenience for callers: open the picker store before navigating to `/exercise-picker`. */
export function openExercisePicker(mode: ExercisePickerMode, initialSelectedIds: string[] = []): void {
  useExercisePickerStore.getState().open({ mode, initialSelectedIds });
}
