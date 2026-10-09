import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth';

import {
  fetchExerciseProgress,
  fetchLifetimeCounts,
  fetchWeightPoints,
} from './ledgerSource';
import { rhythmKeys } from './useLedger';

const FIVE_MINUTES = 5 * 60_000;

/** Lifetime counters (head counts) for stamps. */
export function useLifetimeCounts() {
  const { userId } = useSession();
  return useQuery({
    queryKey: rhythmKeys.counts(userId),
    queryFn: () => fetchLifetimeCounts(userId as string),
    enabled: !!userId,
    staleTime: FIVE_MINUTES,
  });
}

/** Weekly exercise progress rows (`v_exercise_progress`). */
export function useExerciseProgressRows() {
  const { userId } = useSession();
  return useQuery({
    queryKey: rhythmKeys.progress(userId),
    queryFn: () => fetchExerciseProgress(userId as string),
    enabled: !!userId,
    staleTime: FIVE_MINUTES,
  });
}

/** All weigh-ins, oldest first. */
export function useWeightPoints() {
  const { userId } = useSession();
  return useQuery({
    queryKey: rhythmKeys.weights(userId),
    queryFn: () => fetchWeightPoints(userId as string),
    enabled: !!userId,
    staleTime: FIVE_MINUTES,
  });
}
