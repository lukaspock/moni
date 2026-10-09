import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

import { DEFAULT_NUDGE_PREFS, EMPTY_NUDGE_STATE } from '../../domain';
import { storage } from '../../lib/storage';
import { INITIAL_NUDGE_SETTINGS, type NudgeSettings } from './nudgeLogic';

/** Device-local nudge preferences + ledger (notifications are per device, not per account). */
type NudgeStoreState = NudgeSettings & {
  patch: (partial: Partial<NudgeSettings>) => void;
  markOpened: (id: string) => void;
};

const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};

export const useNudgeStore = create<NudgeStoreState>()(
  persist(
    (set) => ({
      ...INITIAL_NUDGE_SETTINGS,
      patch: (partial) => set(partial),
      markOpened: (id) =>
        set((s) =>
          s.openedIds.includes(id)
            ? s
            : { openedIds: [...s.openedIds, id].slice(-50) },
        ),
    }),
    {
      name: 'moeni-nudges',
      version: 1,
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (s): NudgeSettings => ({
        masterEnabled: s.masterEnabled,
        prefs: s.prefs,
        state: s.state,
        scheduled: s.scheduled,
        openedIds: s.openedIds,
        lastOpenDate: s.lastOpenDate,
        suppressedDate: s.suppressedDate,
        migrated: s.migrated,
      }),
      // Fill fields added later from the defaults (deep for prefs/state).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<NudgeSettings>;
        return {
          ...current,
          ...p,
          prefs: {
            ...DEFAULT_NUDGE_PREFS,
            ...p.prefs,
            categories: {
              ...DEFAULT_NUDGE_PREFS.categories,
              ...p.prefs?.categories,
            },
          },
          state: { ...EMPTY_NUDGE_STATE, ...p.state },
        };
      },
    },
  ),
);
