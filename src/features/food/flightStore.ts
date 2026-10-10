import { create } from 'zustand';

/** Screen coordinates (window space), e.g. from `measureInWindow`. */
export interface FlightPoint {
  x: number;
  y: number;
}

export interface PendingMealFlight {
  /** Monotonic id, so a consumer can tell two identical meals apart. */
  id: number;
  kcal: number;
  /** Where the "+520" chip should start (the save button); missing = fades in near the ring. */
  from?: FlightPoint;
}

interface MealFlightBridgeState {
  pending: PendingMealFlight | null;
  /** Called by the food flow right before it dismisses back to Today. */
  queue: (kcal: number, from?: FlightPoint) => void;
  /** Read-and-clear; the Today screen calls this once it is focused and the ring is measured. */
  consume: () => PendingMealFlight | null;
  clear: () => void;
}

let counter = 0;

/**
 * Bridge between the food sheets (log-food / food-review) and Today's KcalRing:
 * the sheet queues `{ kcal, from? }` on a successful save, Today consumes it and
 * launches `useMealFlight().launch({ kcal, from, to: ringCentre })`.
 * Not persisted, purely UI. Saving behaviour is untouched.
 */
export const useMealFlightBridge = create<MealFlightBridgeState>(
  (set, get) => ({
    pending: null,
    queue: (kcal, from) => {
      if (!(kcal > 0)) return;
      counter += 1;
      set({ pending: { id: counter, kcal: Math.round(kcal), from } });
    },
    consume: () => {
      const pending = get().pending;
      if (pending) set({ pending: null });
      return pending;
    },
    clear: () => set({ pending: null }),
  }),
);
