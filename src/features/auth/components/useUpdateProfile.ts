import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { useSession } from '..';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/**
 * Profile sub-screens' shared write: patches the signed-in user's `profiles`
 * row, shows an alert on failure and invalidates `['profile', userId]` so
 * `useProfile()` (and the targets derived from it) recompute.
 */
export function useUpdateProfile() {
  const { t } = useTranslation();
  const { userId } = useSession();
  const queryClient = useQueryClient();

  return useCallback(
    async (patch: ProfileUpdate) => {
      if (!userId) return;
      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId);
      if (error) {
        Alert.alert(t('account.auth.signIn.errors.generic'), error.message);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
    [userId, queryClient, t],
  );
}
