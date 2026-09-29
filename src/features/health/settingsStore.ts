import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

import { storage } from '../../lib/storage';

/**
 * Device-local Apple Health preferences (PLAN §7.5). HealthKit permissions are
 * per device, so these live in MMKV rather than in `profiles`.
 * Same Zustand-persist-over-MMKV pattern as `src/features/auth/onboardingStore.ts`.
 */
type HealthSettingsState = {
  /** Master switch: import from / export to Apple Health. */
  enabled: boolean;
  /** Optional export of `dietaryEnergyConsumed` + macros (PLAN §7.5 toggle). */
  writeNutrition: boolean;
  /** ISO timestamp of the last successful import, or null if never synced. */
  lastSyncedAt: string | null;
  setEnabled: (v: boolean) => void;
  setWriteNutrition: (v: boolean) => void;
  setLastSyncedAt: (iso: string | null) => void;
};

const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};

export const useHealthSettingsStore = create<HealthSettingsState>()(
  persist(
    (set) => ({
      enabled: false,
      writeNutrition: false,
      lastSyncedAt: null,
      setEnabled: (v) => set({ enabled: v }),
      setWriteNutrition: (v) => set({ writeNutrition: v }),
      setLastSyncedAt: (iso) => set({ lastSyncedAt: iso }),
    }),
    {
      name: 'moeni-health-settings',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
