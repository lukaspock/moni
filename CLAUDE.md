# CLAUDE.md – møni

> Keep this file up to date. Whoever changes the architecture, conventions, commands or setup updates this file **in the same step**. Current task status belongs in `DEVLOG.md`, not here.

## What is møni?
An iOS fitness-lifestyle app that connects workout tracking and calorie tracking. Food is logged via photo, text, voice or barcode; Gemini estimates kcal and macros; the daily limit adapts dynamically to training, goal and weight trend.
**Source of truth for product decisions: [`PLAN.md`](PLAN.md)** (do not change it without asking the owner).

## Documents
| File | Purpose |
|---|---|
| `PLAN.md` | Product and technical plan (spec). Read it before starting on a feature. |
| `CLAUDE.md` | How we work: stack, structure, conventions, commands, setup status. |
| `DEVLOG.md` | Checklist + log. **Every agent** ticks off its tasks there and appends a log line. |

## Stack (short)
Expo SDK 57 (`expo` 57.0.25, RN 0.86.3, React 19.2.3; Dev Build via EAS, **not Expo Go**) · TypeScript strict · expo-router (`NativeTabs` from `expo-router/unstable-native-tabs`, Native Stack) · NativeWind v4.2 **+ Tailwind v3.4** (v4 not yet supported by this NativeWind line, see DEVLOG open items) — layout only · expo-glass-effect / @expo/ui/swift-ui / expo-symbols (native Liquid Glass) · Supabase (Auth, Postgres + RLS, Storage, Edge Functions/Deno, pg_cron) · TanStack Query · Zustand · react-native-mmkv v4 (`createMMKV()` factory API) · react-hook-form + zod · i18next · victory-native / Skia · RevenueCat · HealthKit (`@kingstinct/react-native-healthkit`) · Jest (`jest-expo`).
iOS deployment target **26** (via `expo-build-properties`). Platform: iOS only.

## Infrastructure
- **GitHub**: `lukaspock/moeni` (private). Default branch `main`.
- **Supabase**: project ref `ehjqlatmgvytnzftmkgg` (URL `https://ehjqlatmgvytnzftmkgg.supabase.co`), configured as the project MCP in `.mcp.json`. The owner must authenticate the MCP once with `claude /mcp`.
- Secrets (Gemini key, RevenueCat secret, service role) **only** as Supabase secrets, never in the client or the repo. Client env lives in `.env` (gitignored) with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; template in `.env.example`.

## Folder structure
```
app/                 expo-router routes (see PLAN.md §4)
  _layout.tsx         root: QueryClientProvider, i18n init, GestureHandler/SafeArea, Stack
  (tabs)/_layout.tsx   NativeTabs (index/training/insights/profile), SF Symbols
  (tabs)/<tab>/        each tab is its own folder: _layout.tsx (Stack, headerLargeTitle) + index.tsx
src/domain/          PURE calculation logic (no RN/Expo imports) + *.test.ts
src/features/        food/, workout/, targets/, insights/, health/, subscription/ (empty skeletons so far)
src/lib/             supabase.ts, storage.ts (MMKV) — units.ts lives in src/domain (hard rule #3), not here
src/i18n/            index.ts (language registry) + i18next.d.ts (typed keys) + locales/{de,en}.json
src/components/      ui/ (PlaceholderScreen so far), glass/, charts/ (not yet populated)
src/types/database.ts  generated (do not edit by hand) — not created yet, `src/lib/supabase.ts` is untyped until then
supabase/migrations/ SQL migrations (timestamp_name.sql)
supabase/seed.sql    exercise catalog
supabase/functions/  analyze-food, revenuecat-webhook, recompute-targets
```

## Hard rules (from PLAN.md §9)
1. **Native first**: Liquid Glass only through native components (NativeTabs, GlassView, @expo/ui). No expo-blur or opacity fakes.
2. **No hardcoded UI strings**: everything goes through `t('key')`. New keys go into `de.json` **and** `en.json`.
3. **Calculations only in `src/domain`**: pure functions with tests. No calculating inside components.
4. **The DB always stores metric values**; conversion only happens for display and input (`src/lib/units.ts`).
5. **Never put secrets in the client.**
6. **Every table has RLS**; after migrations, check the Supabase advisors.
7. After schema changes, regenerate the types → `src/types/database.ts`.
8. After each phase, start the app in the simulator and check the core flows.

## Conventions
- IDs are client-generated UUIDs (idempotent offline sync).
- Code/identifiers in English, UI in DE+EN through i18n.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:` …). Subagents **do not commit**; the lead agent commits after reviewing.
- Subagents only work inside the file areas assigned to them (see DEVLOG) to avoid collisions.
- Package manager: **npm** (`npx expo install` for Expo-compatible versions).

## Domain
- `src/domain/` is complete for Phase 1 (bmr, tdee, targets, macros, met, adaptive, units, mealType, food, types, barrel `index.ts`), all pure functions with `*.test.ts` next to them, verified with `bun test src/domain` (Jest-compatible API — no bun-specific APIs, no `jest.mock`, so `npm test` with jest-expo will run the same files unchanged).
- Unit-conversion math (kg/lb, cm/ft-in, km/mi) lives in `src/domain/units.ts`, not `src/lib/units.ts` (PLAN §4 sketch) — hard rule #3 puts calculation logic in `src/domain`. `src/lib/units.ts`, when added, should re-export/format `src/domain/units.ts` for display rather than reimplement it.
- `targets.ts` exposes `calculateWorkoutBonus` for the §6.4 dynamic daily limit (provisional vs. actual bonus, eat-back factor); `macros.ts::calculateMacros` must be called with the **total** daily limit (base + workout bonus), not just base_kcal, so the bonus flows mostly into carbs as PLAN §6.4 specifies.

## Backend
- Full details, apply order and secrets checklist: `supabase/README.md`.
- **Enums** are modelled as `text` + `CHECK (... in (...))`, not Postgres `enum` types (easier to extend later, maps directly to TS string-literal unions).
- **RLS pattern**: every table has RLS enabled; policies always use `(select auth.uid())` (not a bare `auth.uid()`) for the performance advisor, split per-command (select/insert/update/delete). Child tables (`food_items`, `routine_exercises`, `workout_sets`) check ownership via `EXISTS` against their parent row. `exercises`: `owner_id is null` = global catalog (readable by all authenticated, not writable by clients), `owner_id = auth.uid()` = user's own, fully manageable. `ai_usage`/`entitlements` are **client read-only**; all writes go through Edge Functions using the service role key (bypasses RLS) — do not add client insert/update policies for those two tables.
- **Views** `v_daily_summary` / `v_exercise_progress` are created `with (security_invoker = true)` so they inherit the querying user's RLS.
- **Secrets** (set as Supabase Edge Function secrets, never in the repo): `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-2.5-flash`), `FREE_AI_LIMIT_PER_DAY` (default `3`), `REVENUECAT_WEBHOOK_SECRET`. `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` are auto-injected per function.
- **`revenuecat-webhook` must deploy with `verify_jwt = false`** (shared-secret auth instead of a Supabase JWT) — see `supabase/config.toml` and the function's own header comment.
- `supabase/functions/_shared/adaptive.ts` is a hand-ported duplicate of `src/domain/adaptive.ts`'s formula (Deno can't import `src/`) — keep both in sync manually when the formula changes.
- `recompute-targets` is currently a Phase 6 skeleton (auth/dispatch wired, recompute logic is `TODO`).

## Commands
```bash
npm install
npx expo start --dev-client     # after the dev build
npx expo run:ios                # local dev build (simulator)
npm test                        # Jest (domain logic)
npm run lint && npm run typecheck
```
Supabase migrations/types/functions currently run through the Supabase MCP (`apply_migration`, `generate_typescript_types`, `deploy_edge_function`). The Supabase CLI is not installed yet.
`.npmrc` sets `legacy-peer-deps=true` — required on this SDK 57 / React 19 combo (`npm install`/`npm ci` ERESOLVE otherwise on a transitive `react-dom` peer nothing here actually uses).

## CI/CD (GitHub Actions)
| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | push to main, every PR | App: `npm ci` → typecheck → lint → jest (+ expo-doctor, non-blocking). Supabase: deno lint/check of functions, migrations + seed against a local Postgres (`supabase db reset --local`), `supabase db lint` |
| `supabase-deploy.yml` | push to main under `supabase/**`, manual | `supabase db push --include-seed` + `functions deploy`. **Only active** when the repo variable `SUPABASE_DEPLOY_ENABLED=true`. Needs secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, variable `SUPABASE_PROJECT_REF`, environment `production` |
| `eas-build.yml` | manual only | iOS build via EAS (profile selectable, optional TestFlight submit). Needs secret `EXPO_TOKEN` + linked EAS project |
| `dependabot.yml` | weekly | Actions + npm (Expo/RN packages excluded → `npx expo install --fix`) |

Rules: CI must stay green before merging. **Migrations go through exactly one path**: once the deploy workflow is active, only via `supabase/migrations/*.sql` + deploy, never directly via MCP `apply_migration` (otherwise the migration history drifts). App secrets (Gemini etc.) are **not** in GitHub; they live only as Supabase secrets.

## Setup status
- [x] PLAN.md, CLAUDE.md, DEVLOG.md
- [x] Supabase project created, MCP in `.mcp.json`
- [ ] Supabase MCP authenticated (owner: `claude /mcp`)
- [x] Git + GitHub repo (github.com/lukaspock/moeni, private)
- [x] Expo scaffold (Phase 0): SDK 57 (expo 57.0.25, RN 0.86.3, React 19.2.3), expo-router + NativeTabs, NativeWind v4.2 + Tailwind v3.4, i18n (DE/EN), Supabase client, ESLint/Prettier/Jest all green. See DEVLOG log entry for details/deviations.
- [x] GitHub Actions (CI, Supabase deploy, EAS build, Dependabot) – deploy/EAS still need secrets
