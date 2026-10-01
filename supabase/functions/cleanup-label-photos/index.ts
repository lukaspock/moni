// møni · cleanup-label-photos Edge Function
//
// Safety net for nutrition-label photos (`food-images/{user_id}/label-*.jpg`). analyze-food
// (mode "label") and the client delete them right after the scan; this daily job (pg_cron,
// migration 20260930140000) removes any that slipped through (crash, offline, 402 before the
// download, ...). Meal photos (`{user_id}/{food_log_id}.jpg`) are never touched.
// Service-role only: `Authorization: Bearer <service_role_key>`.

import { handleCors, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';

const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const BUCKET = 'food-images';
const MAX_AGE_MS = 60 * 60 * 1000; // leave in-flight scans alone
const PAGE = 100;

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (
    !SERVICE_ROLE_KEY ||
    req.headers.get('Authorization') !== `Bearer ${SERVICE_ROLE_KEY}`
  ) {
    return jsonResponse({ error: 'unauthorized' }, { status: 401 });
  }

  const storage = createServiceClient().storage.from(BUCKET);
  const cutoff = Date.now() - MAX_AGE_MS;
  const toDelete: string[] = [];

  const listAll = async (prefix: string) => {
    const out: { name: string; id: string | null; created_at?: string }[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await storage.list(prefix, {
        limit: PAGE,
        offset,
      });
      if (error) throw error;
      out.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }
    return out;
  };

  try {
    // Top level: one folder per user (folders have id === null).
    for (const folder of await listAll('')) {
      if (folder.id !== null) continue;
      for (const file of await listAll(folder.name)) {
        if (
          file.id !== null &&
          file.name.startsWith('label-') &&
          file.created_at &&
          new Date(file.created_at).getTime() < cutoff
        ) {
          toDelete.push(`${folder.name}/${file.name}`);
        }
      }
    }
    for (let i = 0; i < toDelete.length; i += PAGE) {
      const { error } = await storage.remove(toDelete.slice(i, i + PAGE));
      if (error) throw error;
    }
  } catch (err) {
    console.error('cleanup-label-photos failed', err);
    return jsonResponse({ error: 'cleanup_failed' }, { status: 500 });
  }

  return jsonResponse({ deleted: toDelete.length });
});
