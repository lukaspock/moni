/**
 * Device-local rhythm state (docs/05 §2.8): pauses, confirmed rest days, goal overrides,
 * achievements "seen"/"unlocked" records, review/share counters. Zustand + persist over MMKV
 * (same pattern as `onboardingStore`), one entry per user id. Losing it (new device) is
 * acceptable: days are re-evaluated from the ledger and grace tokens catch the gaps.
 */
import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

import type { PauseRange, WeekGoals } from '@/domain';
import { storage } from '@/lib/storage';

export interface UserRhythmLocal {
  pauses: PauseRange[];
  /** `YYYY-MM-DD` days confirmed with "enjoy rest day" */
  restDays: string[];
  goalOverrides: Partial<WeekGoals> | null;
  /** null = this device never initialised the set (fresh install / device change) */
  achvSeen: string[] | null;
  /** achievement id -> `YYYY-MM-DD` it was first detected/proven (never removed) */
  achvUnlocked: Record<string, string>;
  /** highest stage index ever reached on this device (stages never sink) */
  stageHighest: number | null;
  /** week starts of reviews that were viewed to the end */
  reviewsViewed: string[];
  sharedCount: number;
  /** celebrations shown per day (throttle: max 2/day) */
  celebrations: { date: string; count: number };
  /** "N stamps found again" notice after a restore; null = nothing to show */
  restoreNotice: number | null;
  /** user switch: show the rhythm number at all */
  showRhythm: boolean;
}

export const DEFAULT_USER_LOCAL: UserRhythmLocal = {
  pauses: [],
  restDays: [],
  goalOverrides: null,
  achvSeen: null,
  achvUnlocked: {},
  stageHighest: null,
  reviewsViewed: [],
  sharedCount: 0,
  celebrations: { date: '', count: 0 },
  restoreNotice: null,
  showRhythm: true,
};

interface LocalState {
  byUser: Record<string, UserRhythmLocal>;
  patch: (
    userId: string,
    fn: (current: UserRhythmLocal) => Partial<UserRhythmLocal>,
  ) => void;
}

const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};

export const useRhythmLocalStore = create<LocalState>()(
  persist(
    (set) => ({
      byUser: {},
      patch: (userId, fn) =>
        set((state) => {
          const current = state.byUser[userId] ?? DEFAULT_USER_LOCAL;
          const next = { ...current, ...fn(current) };
          return { byUser: { ...state.byUser, [userId]: next } };
        }),
    }),
    {
      name: 'moeni-rhythm-local',
      version: 1,
      storage: createJSONStorage(() => mmkvStorage),
      // fill fields added in later versions so older blobs stay usable
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LocalState>;
        const byUser: Record<string, UserRhythmLocal> = {};
        for (const [id, v] of Object.entries(p.byUser ?? {})) {
          byUser[id] = { ...DEFAULT_USER_LOCAL, ...(v as UserRhythmLocal) };
        }
        return { ...current, byUser };
      },
      partialize: (state) => ({ byUser: state.byUser }) as LocalState,
    },
  ),
);

/** Reactive local state of a user (stable default object while signed out). */
export function useUserLocal(userId: string | null): UserRhythmLocal {
  return useRhythmLocalStore((s) =>
    userId ? (s.byUser[userId] ?? DEFAULT_USER_LOCAL) : DEFAULT_USER_LOCAL,
  );
}

export function patchUserLocal(
  userId: string,
  fn: (current: UserRhythmLocal) => Partial<UserRhythmLocal>,
): void {
  useRhythmLocalStore.getState().patch(userId, fn);
}
