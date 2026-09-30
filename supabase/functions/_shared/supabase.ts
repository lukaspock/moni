// Shared Supabase client factories for møni Edge Functions (Deno).
import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the Supabase platform for every Edge Function — they do not need to be set manually as
// function secrets (see supabase/README.md).

/**
 * A client that acts AS THE CALLING USER: forwards their Authorization header, so every
 * query is subject to RLS exactly as if the client had called Postgres directly.
 * Use this for anything that should respect row ownership.
 */
export function createUserClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

/**
 * A client that BYPASSES RLS entirely using the service role key. Only for server-only
 * operations: incrementing ai_usage, writing entitlements, reading arbitrary users' data for
 * the cron job. NEVER expose this client's key to the app/client.
 */
export function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** Extracts and validates the calling user from the Authorization header via the anon+JWT client. */
export async function getAuthenticatedUser(req: Request) {
  const userClient = createUserClient(req);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();
  if (error || !user) {
    return { user: null, userClient };
  }
  return { user, userClient };
}
