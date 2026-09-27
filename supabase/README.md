# møni · Supabase backend

Written as files by the `backend` agent (no DB access). The `lead` agent applies these to the
hosted project (`ehjqlatmgvytnzftmkgg`, EU/Frankfurt) via the Supabase MCP.

## 1. Migrations — apply in this order

All files are already timestamp-ordered in `supabase/migrations/`; apply them in filename
order (`apply_migration` once per file, or however the MCP batches it):

1. `20260927120000_extensions.sql` — pgcrypto, uuid-ossp.
2. `20260927120100_tables.sql` — all tables from PLAN.md §5.
3. `20260927120200_updated_at_triggers.sql` — generic `set_updated_at()` trigger.
4. `20260927120300_rls.sql` — RLS enabled + policies on every table.
5. `20260927120400_storage.sql` — `food-images` bucket + storage.objects policies.
6. `20260927120500_views.sql` — `v_daily_summary`, `v_exercise_progress` (both `security_invoker`).
7. `20260927120600_functions.sql` — `increment_ai_usage`, `get_ai_usage_count` (service_role only).
8. `20260927120700_cron_recompute_targets.sql` — pg_cron weekly job. **Needs a Vault secret set
   up first/alongside, see §4 below** — read the comments at the top of that file before
   applying it; if pg_cron/pg_net/vault aren't available on the project yet, this migration can
   be applied last (or skipped and revisited) without blocking anything else.

Then: `supabase/seed.sql` (exercise catalog, idempotent — safe to re-run).

After applying: run `get_advisors` (security + performance) and fix anything it flags — in
particular double-check that every new table shows up with RLS enabled and that no policy uses
a bare `auth.uid()` (should always be `(select auth.uid())`, already done here).

Finally: `generate_typescript_types` → `src/types/database.ts`.

## 2. Schema decisions worth knowing

- **Enums as `text` + `CHECK`**, not Postgres `enum` types — easier to extend later (no
  `ALTER TYPE ... ADD VALUE` ceremony) and maps directly to TS string-literal unions. See the
  comment at the top of `20260927120100_tables.sql`.
- **IDs**: every table's `id` is `uuid default gen_random_uuid()`, but the **client always
  supplies its own UUID** on insert (offline-first sync, PLAN.md's "IDs are client-generated
  UUIDs"). Client upserts should use `.upsert(row, { onConflict: 'id' })` (or the SQL
  equivalent) so re-sending an already-synced row is a no-op-ish update, not a duplicate.
- **`profiles`**: all onboarding-derived columns are nullable (sex, birth_date, height_cm,
  activity_level, goal, goal_rate_kg_per_week, workouts_per_week) since they're written after
  signup, not at trigger time. There is **no** signup trigger creating an empty profile row —
  the client is expected to `insert` its own `profiles` row (id = `auth.uid()`) once, whenever
  it first has data to write; RLS's `profiles_insert` policy allows this.
- **`exercises`**: global catalog rows have `owner_id = null` and are readable by any
  authenticated user; a user's custom exercises have `owner_id = auth.uid()` and are fully
  manageable by them only. `name_key` is unique among global rows
  (`exercises_global_name_key_idx`).
- **Child tables** (`food_items`, `routine_exercises`, `workout_sets`) have no `user_id` of
  their own — ownership is checked via `EXISTS` against the parent row in every RLS policy.
- **`ai_usage` / `entitlements`**: RLS grants `select` to `authenticated` for their own row
  only; there is **no** insert/update/delete policy for `authenticated` on either table. All
  writes happen through Edge Functions using the **service role** key, which bypasses RLS.
- **Views** `v_daily_summary` / `v_exercise_progress` are created `with (security_invoker =
  true)` so they run with the querying user's RLS, not the view owner's — otherwise they'd leak
  all users' data. See the Supabase RLS/view security linter docs referenced in
  `20260927120500_views.sql`.

## 3. Storage

Bucket `food-images` is **private**. Path convention: `{user_id}/{food_log_id}.jpg`. RLS on
`storage.objects` checks that `(storage.foldername(name))[1] = auth.uid()::text`, so a user can
only read/write inside their own folder. The client should compress images to ~1024px / JPEG
0.7 before upload (PLAN.md §3) — that's a client-side concern, not enforced here.

## 4. Edge Functions

Located in `supabase/functions/`. Shared helpers in `supabase/functions/_shared/`:
- `cors.ts` — CORS headers + preflight handling.
- `supabase.ts` — `createUserClient` (forwards the caller's JWT, RLS applies),
  `createServiceClient` (service role, bypasses RLS), `getAuthenticatedUser`.
- `adaptive.ts` — Phase 6 adaptive-TDEE formula, a **hand-ported duplicate** of
  `src/domain/adaptive.ts` (Deno can't import from `src/`). **Keep the two in sync manually**
  whenever the domain agent changes the formula — see the comment at the top of that file.

### `analyze-food` (Phase 2)
- `verify_jwt = true` (default) — expects the user's Supabase JWT in `Authorization`.
- Input: `{ image_path?: string, text?: string, locale?: string }` (exactly one of
  `image_path`/`text` required). `image_path` must start with `"{caller's user id}/"`.
- Checks `entitlements` + today's `ai_usage` against `FREE_AI_LIMIT_PER_DAY` → `402` JSON if
  exceeded and not premium.
- Calls Gemini (`GEMINI_MODEL`, default `gemini-2.5-flash`) with `responseSchema` structured
  output, does a server-side plausibility check (kcal vs. 4P+4C+9F, ±15% → corrected), rounds
  values, increments `ai_usage` via the `increment_ai_usage` RPC (service role), and returns
  the result. **Does not write a `food_logs` row** — the client saves after the Review screen.
- Secrets: `GEMINI_API_KEY` (required), `GEMINI_MODEL` (optional), `FREE_AI_LIMIT_PER_DAY`
  (optional, default `3`).

### `revenuecat-webhook` (Phase 7)
- **`verify_jwt = false`** — RevenueCat does not send a Supabase JWT. Auth is a shared secret
  read from the `Authorization` header and compared to the `REVENUECAT_WEBHOOK_SECRET` secret.
  **The lead must set `verify_jwt = false` explicitly when deploying this function** (also
  documented in `supabase/config.toml`), otherwise Supabase's platform-level JWT check will
  reject every RevenueCat request before it reaches this code.
- Upserts `public.entitlements` (`user_id = event.app_user_id`) on
  `INITIAL_PURCHASE`/`RENEWAL`/`UNCANCELLATION`/`PRODUCT_CHANGE`/`NON_RENEWING_PURCHASE`
  (→ premium true) and `EXPIRATION` (→ premium false); `CANCELLATION`/`BILLING_ISSUE` only
  update `expires_at`.
- **Client-side convention this depends on**: the app must call
  `Purchases.logIn(supabaseUserId)` so RevenueCat's `app_user_id` equals the Supabase auth
  user id — otherwise this function can't map events to `entitlements` rows. Make sure whoever
  wires up RevenueCat on the client does this.
- Secret: `REVENUECAT_WEBHOOK_SECRET` (required) — set the same value in the RevenueCat
  dashboard's webhook config.

### `recompute-targets` (Phase 6)
- Deliberately a **thin skeleton** (Phase 6 is far out) — auth/dispatch plumbing is in place
  (service-role call = all users / cron, user JWT = just that user), the actual recompute
  logic is a `TODO` block. See the comments in `index.ts` before implementing.
- Will be triggered weekly by pg_cron (see migration 008) and optionally by the client on app
  start if a recompute is due.
- `verify_jwt = true` for the client-call path; the cron path authenticates with the service
  role key instead (checked manually in code, same function).

## 5. Secrets checklist (owner/lead to set via Supabase dashboard or MCP)

| Secret | Used by | Notes |
|---|---|---|
| `GEMINI_API_KEY` | `analyze-food` | Google AI Studio / Vertex API key. Never in the client. |
| `GEMINI_MODEL` | `analyze-food` | Optional, default `gemini-2.5-flash`. |
| `FREE_AI_LIMIT_PER_DAY` | `analyze-food` | Optional, default `3`. |
| `REVENUECAT_WEBHOOK_SECRET` | `revenuecat-webhook` | Shared secret, also entered in the RevenueCat dashboard. |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically for
every Edge Function by the platform — do not set them manually.

## 6. Function deploy settings

| Function | `verify_jwt` |
|---|---|
| `analyze-food` | `true` (default) |
| `revenuecat-webhook` | **`false`** — must be set explicitly |
| `recompute-targets` | `true` (default) — cron calls authenticate via the service-role bearer token, checked in code, not via platform JWT verification |

(`supabase/config.toml` documents the same table for local `supabase start`/CLI use; the
hosted project's function settings are separate and must be set when deploying via
`deploy_edge_function` / the dashboard.)

## 7. Cron (pg_cron) setup

See the detailed comment block at the top of
`supabase/migrations/20260927120700_cron_recompute_targets.sql` — no separate action beyond
that file plus **creating the `service_role_key` Vault secret once** (command is in the file's
header comment) before or right after applying it. The job posts to
`https://ehjqlatmgvytnzftmkgg.supabase.co/functions/v1/recompute-targets` every Monday 03:00
UTC. If the project ref ever changes, update the URL literal inside
`public.trigger_recompute_targets()` (a new migration, don't hand-edit the applied one).

## 8. `seed.sql` / `seed-exercise-names.json`

`supabase/seed.sql` inserts ~150 global exercises with deterministic
`uuid_generate_v5(namespace, 'exercise.<name>')` ids — safe to re-run
(`on conflict (id) do nothing`). It only writes `name_key`, category, muscle_groups, equipment,
met_value and tracking_type — **no display strings** (i18n is a client concern).

`supabase/seed-exercise-names.json` has the shape `{ "de": { "exercise.bench_press":
"Bankdrücken", ... }, "en": { "exercise.bench_press": "Bench Press", ... } }` for all 150
`name_key`s. The scaffold/lead agent should merge these into `src/i18n/locales/de.json` and
`src/i18n/locales/en.json` (e.g. under an `"exercise"` namespace/prefix matching the keys as-is
since they're already dot-namespaced as `exercise.xxx`).

## 9. Open items for the lead / owner

- Authenticate the Supabase MCP (`claude /mcp`) before any of this can actually be applied.
- Create the `service_role_key` Vault secret for the cron job (§7) — or decide pg_cron/pg_net
  aren't wanted yet and skip migration 008 for now.
- Decide the final Gemini model + measure real cost per scan before calibrating
  `FREE_AI_LIMIT_PER_DAY` (PLAN.md §10).
- Set `REVENUECAT_WEBHOOK_SECRET` once RevenueCat is configured (Phase 7), and confirm the
  client calls `Purchases.logIn(supabaseUserId)` (§4 above) — this function silently can't
  attribute events otherwise.
- No `deno` binary was available in this environment, so Edge Functions were reviewed by hand
  instead of `deno check`/`deno lint`. Recommend running `deno check supabase/functions/**/*.ts`
  once `deno` is installed, before first deploy.
