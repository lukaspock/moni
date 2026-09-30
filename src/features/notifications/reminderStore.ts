import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

import { storage } from '../../lib/storage';

/** Device-local meal-reminder preference (notifications are per device, not per account). */
type ReminderState = {
  enabled: boolean;
  setEnabledFlag: (enabled: boolean) => void;
};

const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};

export const useReminderStore = create<ReminderState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabledFlag: (enabled) => set({ enabled }),
    }),
    {
      name: 'moeni-meal-reminders',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (s) => ({ enabled: s.enabled }),
    },
  ),
);
