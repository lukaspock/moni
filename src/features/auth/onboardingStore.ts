import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { ActivityLevel, Goal, Sex, UnitSystem } from '../../domain';
import { storage } from '../../lib/storage';

/**
 * §7.1 – onboarding answers, held in MMKV until sign-up, then written to
 * `profiles`/`training_plan_days`/`weight_logs` (see `applyOnboardingDraft.ts`).
 * Zustand (not a raw MMKV read) so the auth gate in `app/_layout.tsx` can
 * react to `completed` flipping without a manual re-render.
 */
export type OnboardingDraft = {
  sex: Sex | null;
  birthDate: string | null; // YYYY-MM-DD
  heightCm: number | null;
  weightKg: number | null;
  unitSystem: UnitSystem;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  goalRateKgPerWeek: number;
  workoutsPerWeek: number;
  /** 0 (Sun) – 6 (Sat), matches `training_plan_days.weekday` */
  trainingWeekdays: number[];
  eatBackFactor: number;
};

const initialDraft: OnboardingDraft = {
  sex: null,
  birthDate: null,
  heightCm: null,
  weightKg: null,
  unitSystem: 'metric',
  activityLevel: null,
  goal: null,
  goalRateKgPerWeek: 0,
  workoutsPerWeek: 3,
  trainingWeekdays: [],
  eatBackFactor: 0.7,
};

type OnboardingState = {
  draft: OnboardingDraft;
  /** true once the result screen was confirmed — routes the user to (auth) instead of (onboarding) */
  completed: boolean;
  /** true once the draft has been written to profiles/training_plan_days/weight_logs after first sign-in */
  appliedToProfile: boolean;
  update: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
  markCompleted: () => void;
  markAppliedToProfile: () => void;
};

const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      draft: initialDraft,
      completed: false,
      appliedToProfile: false,
      update: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
      reset: () => set({ draft: initialDraft, completed: false, appliedToProfile: false }),
      markCompleted: () => set({ completed: true }),
      markAppliedToProfile: () => set({ appliedToProfile: true }),
    }),
    {
      name: 'moeni-onboarding',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
