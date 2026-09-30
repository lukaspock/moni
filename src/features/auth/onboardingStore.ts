import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

import type {
  ActivityLevel,
  Diet,
  Goal,
  Motivation,
  Sex,
  TrainingExperience,
  UnitSystem,
} from '../../domain';
import { storage } from '../../lib/storage';

/**
 * §7.1 – onboarding answers, held in MMKV until sign-up, then written to
 * `profiles`/`training_plan_days`/`weight_logs` (see `applyOnboardingDraft.ts`).
 * Zustand (not a raw MMKV read) so the auth gate in `app/_layout.tsx` can
 * react to `completed`/`wantsSignIn` flipping without a manual re-render.
 */
export type OnboardingDraft = {
  /** first name for greetings; '' = skipped */
  displayName: string;
  motivation: Motivation | null;
  sex: Sex | null;
  birthDate: string | null; // YYYY-MM-DD
  heightCm: number | null;
  weightKg: number | null;
  unitSystem: UnitSystem;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  /** optional goal weight (lose/gain only), metric */
  targetWeightKg: number | null;
  goalRateKgPerWeek: number;
  trainingExperience: TrainingExperience | null;
  workoutsPerWeek: number;
  /** 0 (Sun) – 6 (Sat), matches `training_plan_days.weekday` */
  trainingWeekdays: number[];
  diet: Diet | null;
  /** ISO timestamp of the "no medical advice" acknowledgement */
  disclaimerAcceptedAt: string | null;
  eatBackFactor: number;
};

export const initialOnboardingDraft: OnboardingDraft = {
  displayName: '',
  motivation: null,
  sex: null,
  birthDate: null,
  heightCm: null,
  weightKg: null,
  unitSystem: 'metric',
  activityLevel: null,
  goal: null,
  targetWeightKg: null,
  goalRateKgPerWeek: 0,
  trainingExperience: null,
  workoutsPerWeek: 3,
  trainingWeekdays: [],
  diet: null,
  disclaimerAcceptedAt: null,
  eatBackFactor: 0.7,
};

type OnboardingState = {
  draft: OnboardingDraft;
  /** true once the whole flow (incl. permission primers) was finished — the draft is ready to be written */
  completed: boolean;
  /** true once the draft has been written to profiles/training_plan_days/weight_logs after sign-in */
  appliedToProfile: boolean;
  /** returning user tapped "I already have an account" on Welcome → show (auth) without a finished draft */
  wantsSignIn: boolean;
  update: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
  /** end of the flow: draft is final, (re-)arm the apply step */
  finishOnboarding: () => void;
  markAppliedToProfile: () => void;
  setWantsSignIn: (value: boolean) => void;
};

const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};

/**
 * v0 (Sprint 1) drafts lack the v2 fields. Missing keys are filled from
 * `initialOnboardingDraft`; a v0 `completed: true` stays valid (its answers
 * are all still required fields), the new fields just remain empty.
 */
const STORE_VERSION = 1;

type PersistedShape = Partial<
  Pick<OnboardingState, 'completed' | 'appliedToProfile' | 'wantsSignIn'>
> & {
  draft?: Partial<OnboardingDraft>;
};

function hydrate(persisted: unknown): PersistedShape {
  const p = (
    persisted && typeof persisted === 'object' ? persisted : {}
  ) as PersistedShape;
  return {
    completed: !!p.completed,
    appliedToProfile: !!p.appliedToProfile,
    wantsSignIn: !!p.wantsSignIn,
    draft: { ...initialOnboardingDraft, ...(p.draft ?? {}) },
  };
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      draft: initialOnboardingDraft,
      completed: false,
      appliedToProfile: false,
      wantsSignIn: false,
      update: (patch) =>
        set((state) => ({ draft: { ...state.draft, ...patch } })),
      reset: () =>
        set({
          draft: initialOnboardingDraft,
          completed: false,
          appliedToProfile: false,
          wantsSignIn: false,
        }),
      finishOnboarding: () =>
        set({ completed: true, appliedToProfile: false, wantsSignIn: false }),
      markAppliedToProfile: () => set({ appliedToProfile: true }),
      setWantsSignIn: (value) => set({ wantsSignIn: value }),
    }),
    {
      name: 'moeni-onboarding',
      version: STORE_VERSION,
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (s) => ({
        draft: s.draft,
        completed: s.completed,
        appliedToProfile: s.appliedToProfile,
        wantsSignIn: s.wantsSignIn,
      }),
      migrate: (persisted) => hydrate(persisted) as OnboardingState,
      // Deep-merge the draft so a key added later never comes back `undefined`.
      merge: (persisted, current) => {
        const h = hydrate(persisted);
        return { ...current, ...h, draft: { ...current.draft, ...h.draft } };
      },
    },
  ),
);

/** All answers the calorie math needs are present (the v2 personalization fields are optional). */
export function isDraftComplete(draft: OnboardingDraft): boolean {
  return !!(
    draft.sex &&
    draft.birthDate &&
    draft.heightCm &&
    draft.weightKg &&
    draft.activityLevel &&
    draft.goal
  );
}
