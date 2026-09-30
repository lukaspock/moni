import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';

import { smoothTrend, type WeightPoint } from '@/domain';
import { useSession } from '@/features/auth';
import { toISODate } from '@/lib/date';
import { supabase } from '@/lib/supabase';

export interface WeightEntry {
  id: string;
  /** local YYYY-MM-DD */
  date: string;
  weightKg: number;
  source: string;
  createdAt: string;
}

export const weightLogsKey = (userId: string | null) =>
  ['weightLogs', userId] as const;

/** All weight entries of the user, oldest first (several per day are legit). */
export function useWeightEntries(): {
  entries: WeightEntry[];
  isLoading: boolean;
  isError: boolean;
} {
  const { userId } = useSession();
  const query = useQuery({
    queryKey: weightLogsKey(userId),
    queryFn: async (): Promise<WeightEntry[]> => {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('id,date,weight_kg,source,created_at')
        .eq('user_id', userId!)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(5000);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        date: r.date,
        weightKg: r.weight_kg,
        source: r.source,
        createdAt: r.created_at,
      }));
    },
    enabled: !!userId,
  });
  return {
    entries: query.data ?? [],
    isLoading: !!userId && query.isLoading,
    isError: query.isError,
  };
}

/** Raw (daily-averaged) and smoothed points for charting. */
export function useWeightTrend(): {
  entries: WeightEntry[];
  raw: WeightPoint[];
  trend: WeightPoint[];
  isLoading: boolean;
} {
  const { entries, isLoading } = useWeightEntries();
  const { raw, trend } = useMemo(() => {
    const rawPoints = entries.map((e) => ({
      date: e.date,
      weightKg: e.weightKg,
    }));
    return { raw: rawPoints, trend: smoothTrend(rawPoints) };
  }, [entries]);
  return { entries, raw, trend, isLoading };
}

function useInvalidateWeight() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  return () => {
    void queryClient.invalidateQueries({ queryKey: weightLogsKey(userId) });
    // the dashboard/targets and workout kcal hooks read the latest weight
    void queryClient.invalidateQueries({ queryKey: ['latestWeight'] });
    void queryClient.invalidateQueries({ queryKey: ['targets'] });
    void queryClient.invalidateQueries({
      queryKey: ['workout', 'latestWeight'],
    });
  };
}

/** Insert with a client-generated UUID — no (user_id, date) constraint exists. */
export function useAddWeight() {
  const { userId } = useSession();
  const invalidate = useInvalidateWeight();
  return useMutation({
    mutationFn: async (input: { weightKg: number; date?: string }) => {
      if (!userId) throw new Error('not signed in');
      const { error } = await supabase.from('weight_logs').insert({
        id: Crypto.randomUUID(),
        user_id: userId,
        date: input.date ?? toISODate(),
        weight_kg: input.weightKg,
        source: 'manual',
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateWeight() {
  const invalidate = useInvalidateWeight();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      weightKg: number;
      date: string;
    }) => {
      const { error } = await supabase
        .from('weight_logs')
        .update({ weight_kg: input.weightKg, date: input.date })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteWeight() {
  const invalidate = useInvalidateWeight();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('weight_logs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
