// CONTRACT (owner: `account` agent). Signatures are fixed, implementation is replaced.
import type { Session } from '@supabase/supabase-js';

export type SessionState = {
  session: Session | null;
  userId: string | null;
  isLoading: boolean;
};

/** Current Supabase auth session (reactive). */
export function useSession(): SessionState {
  return { session: null, userId: null, isLoading: false };
}
