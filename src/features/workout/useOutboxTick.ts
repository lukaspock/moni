import { useEffect, useState } from 'react';

import { subscribeOutbox } from '@/lib/outbox';

/**
 * Counter that increments (debounced) whenever the offline outbox changes —
 * a row was queued, merged, synced or dropped. Read hooks list it as an effect
 * dependency to refetch/re-overlay. Debounced because finishing a workout
 * queues one entry per set in a burst; one refresh after the burst is enough.
 */
export function useOutboxTick(delayMs: number = 250): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeOutbox(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setTick((t) => t + 1), delayMs);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [delayMs]);
  return tick;
}
