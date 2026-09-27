// møni · recompute-targets Edge Function (Phase 6 — PLAN.md §6.7, §8)
//
// Intentionally a thin SKELETON for now: Phase 0-5 do not depend on this function, and the
// full implementation belongs to Phase 6 together with the `domain` agent's
// src/domain/adaptive.ts and the Insights tab. Wiring (auth, cron entry point, per-user vs.
// all-users mode) is in place so the `lead` agent can deploy it early and flesh out the body
// later without re-plumbing auth/cron.
//
// Two call modes:
//  1. Cron (weekly, see supabase/migrations/20260927120700_cron_recompute_targets.sql): called
//     with the SERVICE ROLE key via `Authorization: Bearer <service_role_key>`, no specific
//     user — should recompute for ALL eligible users.
//  2. Client (e.g. "recompute now" button, or on app start if due): called with the user's own
//     JWT — should recompute for just `auth.getUser()`'s id.
//
// Required secrets: none beyond the platform-injected SUPABASE_URL / SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY (see supabase/functions/_shared/supabase.ts).

import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
// TODO(Phase 6): import and call `computeAdaptiveTdee` from "../_shared/adaptive.ts" once the
// loop below is implemented (see the sync note at the top of that file). Not imported yet to
// avoid an unused-import lint warning in this skeleton.

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceRoleCall =
    !!SERVICE_ROLE_KEY && authHeader === `Bearer ${SERVICE_ROLE_KEY}`;

  // TODO(Phase 6): use `_serviceClient` (bypasses RLS) to write tdee_estimates/daily_targets in
  // both branches below. Prefixed with `_` for now since it's otherwise unused in this skeleton.
  const _serviceClient = createServiceClient();

  if (isServiceRoleCall) {
    // --- Cron / all-users mode -------------------------------------------------------
    // TODO(Phase 6):
    //   1. Select all users eligible for recompute: profiles with >=14 days since signup
    //      (or since last recompute) AND enough weight_logs/food_logs coverage (see
    //      _shared/adaptive.ts MIN_* constants) — do the eligibility pre-filter in SQL where
    //      possible to avoid loading unnecessary data.
    //   2. For each eligible user: load the observation window (weight_logs, food_logs sums
    //      per day), this week's formula TDEE (port of src/domain/tdee.ts, or read the most
    //      recent daily_targets.tdee_used as a proxy), and last week's tdee_estimates row.
    //   3. Call computeAdaptiveTdee(...) from _shared/adaptive.ts.
    //   4. Upsert public.tdee_estimates (user_id, week_start) and recompute this week's
    //      public.daily_targets rows from the new blended TDEE using the same
    //      macro-split logic as src/domain/targets.ts / macros.ts (port or share via a
    //      similar _shared file once that logic exists).
    //   5. Return a summary ({ processed, updated, skipped, errors }) for observability.
    console.log("recompute-targets: cron/service-role call received (not yet implemented)");
    return jsonResponse({
      ok: true,
      mode: "all_users",
      note: "recompute-targets is a Phase 6 skeleton; no targets were recomputed.",
    });
  }

  // --- Single-user mode (client JWT) ------------------------------------------------
  const { user } = await getAuthenticatedUser(req);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, { status: 401 });
  }

  // TODO(Phase 6): same steps as above (2-4), scoped to this one user.id, using
  // `serviceClient` (bypasses RLS, needed to write tdee_estimates/daily_targets which have no
  // client insert-via-edge-function policy assumptions) or `createUserClient`/`userClient` if
  // the write should go through the user's own RLS-checked policies instead.
  console.log("recompute-targets: user call received for", user.id, "(not yet implemented)");

  return jsonResponse({
    ok: true,
    mode: "single_user",
    user_id: user.id,
    note: "recompute-targets is a Phase 6 skeleton; no targets were recomputed.",
  });
});
