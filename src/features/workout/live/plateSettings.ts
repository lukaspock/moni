/**
 * Device-local plate calculator setting: the bar weight per unit (MMKV,
 * Zustand persist so the calculator re-renders on change). Stored in the
 * display unit on purpose: bars are sold as 20 kg / 45 lb, not converted.
 */
import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

import { DEFAULT_BAR, clampBarWeight, type PlateUnit } from '@/domain/plates';
import { storage } from '@/lib/storage';

const mmkvStateStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};

interface PlateSettingsState {
  bar: Record<PlateUnit, number>;
  setBar: (unit: PlateUnit, weight: number) => void;
}

export const usePlateSettings = create<PlateSettingsState>()(
  persist(
    (set) => ({
      bar: { ...DEFAULT_BAR },
      setBar: (unit, weight) =>
        set((s) => ({
          bar: { ...s.bar, [unit]: clampBarWeight(weight, unit) },
        })),
    }),
    {
      name: 'workout:plateSettings',
      version: 1,
      storage: createJSONStorage(() => mmkvStateStorage),
      partialize: (s) => ({ bar: s.bar }),
      merge: (persisted, current) => ({
        ...current,
        bar: {
          ...current.bar,
          ...((persisted as Partial<PlateSettingsState> | undefined)?.bar ??
            {}),
        },
      }),
    },
  ),
);
