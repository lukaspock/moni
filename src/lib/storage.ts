import { createMMKV } from 'react-native-mmkv';

/**
 * Single shared MMKV instance for the whole app: onboarding draft (PLAN §7.1),
 * offline outbox (PLAN §7.7), cached catalogs, and the Supabase auth session
 * (see `supabaseAuthStorage` below).
 */
export const storage = createMMKV({ id: 'moeni' });

/**
 * Adapter satisfying Supabase's `SupportedStorage` interface so
 * `@supabase/supabase-js` can persist the auth session in MMKV instead of
 * `AsyncStorage`. MMKV is synchronous, so the methods just wrap it in
 * resolved promises.
 */
export const supabaseAuthStorage = {
  getItem: (key: string): Promise<string | null> => {
    const value = storage.getString(key);
    return Promise.resolve(value ?? null);
  },
  setItem: (key: string, value: string): Promise<void> => {
    storage.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    storage.remove(key);
    return Promise.resolve();
  },
};
