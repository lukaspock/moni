# DEVLOG – møni

Checklist + log for the lead agent and subagents.
**Rules:** Tick off tasks (`[x]`) as soon as they are done. Append blockers/decisions below the log. Log format: `YYYY-MM-DD · <agent> · what was done / what is open`.
Agents: `lead` (Opus, coordinator/review/commits), `scaffold`, `domain`, `backend` (Sonnet subagents).

---

## Phase 0 – Setup
- [x] `lead` CLAUDE.md + DEVLOG.md
- [x] `lead` Git init, .gitignore, GitHub repo `lukaspock/moeni`
- [x] `lead` Supabase project + MCP config
- [x] `scaffold` Expo project (TS strict, name `moeni`, bundle id `app.moeni`), app.config.ts, iOS target 26
- [x] `scaffold` EAS + expo-dev-client, eas.json (development/preview/production)
- [x] `scaffold` expo-router + NativeTabs skeleton (Today, Training, Insights, Profile) with SF Symbols
- [x] `scaffold` NativeWind + PlatformColor tokens
- [x] `scaffold` i18n skeleton (i18next, DE/EN, typed keys, device language)
- [x] `scaffold` src/lib/supabase.ts (+ MMKV storage), .env.example
- [x] `scaffold` ESLint + Prettier + Jest (jest-expo) + scripts (test, lint, typecheck)
- [x] `backend` Migrations for all tables from PLAN §5 incl. RLS, indexes, storage bucket, views
- [x] `backend` seed.sql exercise catalog (~150 exercises, name_key + MET)
- [ ] `lead` Apply migrations to Supabase, check advisors, generate types
- [x] `lead` First dev build in the simulator

## CI/CD
- [x] `lead` ci.yml (app: typecheck/lint/jest · supabase: deno + local migrations + db lint)
- [x] `lead` supabase-deploy.yml (gated via SUPABASE_DEPLOY_ENABLED)
- [x] `lead` eas-build.yml (manual) + dependabot
- [x] `scaffold` make typecheck/lint/jest green (prerequisite for green CI)
- [ ] `owner` GitHub secrets/variables: SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, SUPABASE_PROJECT_REF, EXPO_TOKEN
- [ ] `lead` first green CI run on GitHub

## Phase 1 – Onboarding, auth, goals
- [x] `domain` bmr.ts, tdee.ts, targets.ts, macros.ts, met.ts, adaptive.ts, units.ts + tests (PLAN §6)
- [ ] Onboarding flow (MMKV draft)
- [ ] Auth: Apple, Google, email (password + magic link)
- [ ] Save profile, result screen, compute daily_targets

## Phase 2 – Food logging core
- [x] `backend` Edge Function `analyze-food` (Gemini structured output, limit, plausibility check)
- [ ] Photo + text flow, review screen
- [ ] Today dashboard (ring, macros, meals, day navigation)

## Phase 3 – Food convenience
- [ ] Barcode (Open Food Facts), favorites/recent/"same as yesterday", meal categories, voice input

## Phase 4 – Workouts
- [ ] Routines, weekly plan, active workout offline + outbox, MET, dynamic daily limit, protein coupling, history/progress

## Phase 5 – Apple Health
- [ ] Permissions, workout + weight import, dedupe, write-back

## Phase 6 – Weight, adaptive TDEE, insights
- [ ] Weight logging + chart, `recompute-targets` + pg_cron, Insights tab

## Phase 7 – Monetization
- [ ] RevenueCat, paywall, `revenuecat-webhook`, server-side limit

## Phase 8 – Polish & release
- [ ] Haptics, empty/error states, a11y, app icon, privacy, account deletion, TestFlight

---

## Log
- 2026-09-27 · lead · Read PLAN.md, created CLAUDE.md + DEVLOG.md. Registered new Supabase project `ehjqlatmgvytnzftmkgg` in `.mcp.json`.
- 2026-09-27 · lead · Git init + private GitHub repo lukaspock/moeni, first commit pushed. Started subagents scaffold, domain, backend (Sonnet 5).
- 2026-09-27 · domain · Implemented `src/domain/` (bmr, tdee, targets, macros, met, adaptive, units, mealType, food + types + barrel index.ts), all per PLAN §5/§6. 89 tests across 9 `*.test.ts` files, all passing via `bun test src/domain` (Jest-compatible API, no bun-specific calls, no jest.mock). Key design decisions not fully pinned down in PLAN, documented as comments in the modules: adaptive blend weight `w` = `0.8 × avg(daysFactor, entriesFactor, coverageFactor)` with saturation points at 90 days / 60 weight entries / 100% coverage (same score used as `confidence`); strength-training MET interpolates linearly between 3.5 (≤0.15 sets/min) and 6.0 (≥0.6 sets/min) session density. `units.ts` (kg/lb, cm/ft-in, km/mi, rounding) lives in `src/domain` per hard rule #3 even though PLAN §4 sketches it under `src/lib` — `src/lib/units.ts` (scaffold/future work) should re-export/format these for display rather than reimplement the math. No package.json/tsconfig exists yet (scaffold agent in progress), so strict-mode compilation wasn't separately verified beyond `bun test`'s TS transpile.
- 2026-09-27 · lead · GitHub Actions created (CI, Supabase deploy, EAS build, Dependabot). Push is waiting for the scaffold agent so that main does not go red.
- 2026-09-27 · backend · Wrote the full Supabase backend as files (no DB access, not applied yet): 8 timestamped migrations in `supabase/migrations/` (extensions → tables → updated_at triggers → RLS → storage → views → functions/RPC → pg_cron), `supabase/seed.sql` (150 deterministic-UUID global exercises) + `supabase/seed-exercise-names.json` (DE/EN display names for scaffold/lead to merge into i18n), 3 Edge Functions (`analyze-food`, `revenuecat-webhook`, `recompute-targets` skeleton) + `_shared/` (cors, supabase clients, adaptive-TDEE port), `supabase/config.toml`, `supabase/README.md` (apply order, secrets, deploy settings, cron setup). Enums modelled as text+CHECK (documented, not Postgres enum types). Every table has RLS with `(select auth.uid())`; child tables (food_items/routine_exercises/workout_sets) use EXISTS-on-parent policies; ai_usage/entitlements are client-read-only, service-role-write-only. `deno` was not installed in this environment, so functions were reviewed by hand instead of `deno check`/`deno lint` — recommend running that once `deno` is available, before first deploy.
- 2026-09-27 · lead · Backend reviewed (deno lint/check green, image_path hardened against `..`), committed locally. Owner has set GEMINI_API_KEY in Supabase.
- 2026-09-27 · scaffold · Expo SDK 57 (expo 57.0.25, RN 0.86.3, React 19.2.3) scaffolded via `create-expo-app@latest` (blank-typescript base, then hand-built app/src per PLAN §4). `app.config.ts`: name `møni`, slug/scheme `moeni`, iOS bundle id `app.moeni`, `expo-build-properties` deployment target 26.0, plugins `expo-router`/`expo-dev-client`/`expo-font`/`expo-localization`/`expo-splash-screen`. `eas.json` with development (dev client, simulator)/preview/production profiles. `expo-router` + `NativeTabs` (`expo-router/unstable-native-tabs`): 4 tabs (index=Today, training, insights, profile), each its own folder with a nested `Stack` (`headerLargeTitle: true`) + placeholder screen, SF Symbols via `NativeTabs.Trigger.Icon sf={...}`. NativeWind v4.2.7 + Tailwind **v3.4** (v4 is NOT yet supported by this NativeWind line — `expo-doctor`'s Metro check fails hard on it); `tailwind.config.js` tokens (`label`, `secondary-label`, `system-background`, `secondary-system-background`, `system-grouped-background`, `separator`, `tint`, `destructive`, …) reproduce `PlatformColor`'s `{ semantic: [name] }` shape by hand instead of `require('react-native')`, because RN's entry point uses Flow syntax that plain Node (which is what loads `tailwind.config.js`) can't parse — this broke both `expo-doctor` and would have broken real Metro startup. i18n: `src/i18n/index.ts` registry (`de`/`en`, device-language detection via `expo-localization`, fallback `en`) + `src/i18n/i18next.d.ts` typed `t()` keys off `de.json`. `src/lib/storage.ts` (MMKV v4's new `createMMKV()` factory API, not the old `new MMKV()`) + `supabaseAuthStorage` adapter; `src/lib/supabase.ts` reads `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`, throws early if missing (not yet parametrized with generated `Database` types — those don't exist yet, TODO left inline for whoever regenerates them). `.env.example` added. ESLint flat config (`eslint-config-expo/flat`) + Prettier (+ `prettier-plugin-tailwindcss`) + Jest (`jest-expo`, `testMatch` explicitly includes `src/domain/**/*.test.ts`). `tsconfig.json` excludes `supabase/**` (Deno runtime, not this project's TS). Verified: `npm run typecheck` / `npm run lint` / `npm test -- --ci` (89/89 domain tests pass, untouched) / `npx expo-doctor` (21/21) all green; `npx expo prebuild --platform ios --clean` succeeds and produces the expected bundle id/scheme/deployment target 26.0 in the generated `ios/` project (removed again afterwards, it's gitignored) — `pod install` itself failed on this machine due to a local Ruby/CocoaPods UTF-8 encoding issue, unrelated to the scaffold. Added `.npmrc` (`legacy-peer-deps=true`) so `npm ci`/`npm install` resolve without `--legacy-peer-deps`: SDK 57's `react-dom`/`expo` peer graph otherwise ERESOLVEs even though nothing here actually uses `react-dom`. Also had to add `@react-native/jest-preset` and `babel-preset-expo` as devDependencies (jest-expo peers) and `expo-font` (peer dep of `expo-symbols`) that `expo install` didn't pull in on its own.
- 2026-09-27 · lead · First dev build running (iPhone 18 Pro sim). Fixes: project path → ASCII `moeni` (symlink møni), nitro-modules added, UIScene plugin for the iOS 27 SDK.

## Open items / blockers
- Supabase MCP must be authenticated by the owner (`claude /mcp` in a terminal); after that, restart the session so the lead can apply migrations.
- Decide on the Gemini model + measure its cost (PLAN §10).
- Branding (accent color, icon) is still open.
- ~~Gemini API key~~ ✅ owner set `GEMINI_API_KEY` as a Supabase secret (2026-09-27).
- `backend`: before applying migration `20260927120700_cron_recompute_targets.sql`, the lead/owner must create a Supabase Vault secret `service_role_key` (SQL command is in that file's header comment) — otherwise the weekly cron job silently no-ops (it warns and returns instead of failing). If Vault/pg_cron/pg_net aren't available on the plan yet, that one migration can be deferred without blocking anything else — see `supabase/README.md` §1 and §9.
- `backend`: `revenuecat-webhook` MUST be deployed with `verify_jwt = false` (documented in `supabase/config.toml` and `supabase/README.md` §6) and depends on the client calling `Purchases.logIn(supabaseUserId)` so RevenueCat's `app_user_id` matches the Supabase user id — flag this to whoever wires up RevenueCat in Phase 7.
- `backend`: `recompute-targets` is a deliberate thin skeleton (Phase 6 work, not implemented) — auth/dispatch plumbing only, TODOs inline. `supabase/functions/_shared/adaptive.ts` is a hand-ported duplicate of `src/domain/adaptive.ts`'s formula (Deno can't import from `src/`); whoever changes the domain version must port the change there too.
- `backend` → `lead`: **CI risk on `ci.yml`'s `supabase db reset --local`** — migration `20260927120700_cron_recompute_targets.sql` calls `vault.decrypted_secrets`/`cron.schedule`/`net.http_post` at apply time (not just definition time, via the `select cron.schedule(...)` call). This assumes `pg_cron`/`pg_net`/Vault are available in the Supabase CLI's local Postgres image. If local `supabase db reset` fails on this migration, either confirm those extensions are preloaded locally, or move this one migration out of the auto-applied set (e.g. apply it only against the hosted project) — not verified in this environment since neither `deno` nor the Supabase CLI were installed here.
- `scaffold`: **do not bump NativeWind past v4.2.x without also re-pinning Tailwind to v3** — `tailwindcss@latest` currently resolves to v4, which this NativeWind line does not support (breaks Metro config / `expo-doctor`). Revisit together when NativeWind v5 (Tailwind v4 support) ships.
- `scaffold`: `src/lib/supabase.ts` creates an **untyped** `createClient(...)` — once `lead` regenerates `src/types/database.ts` from real migrations, parametrize it as `createClient<Database>(...)` (see the `TODO(lead)` comment in that file).
- `scaffold`: `npm install`/`expo install` need `.npmrc`'s `legacy-peer-deps=true` on this SDK/React 19 combo (an unrelated `react-dom@19.3.0` peer creeps in transitively and ERESOLVEs otherwise). If a future Expo SDK bump resolves that peer graph cleanly, this can be removed.
- `scaffold` → future (Phase 4): `supabase/seed-exercise-names.json` (DE/EN display names for the ~150 seeded exercises, from `backend`) is not yet merged into `src/i18n/locales/{de,en}.json` — left for whoever builds the exercise picker/catalog UI, since it's ~150 keys and out of scope for the Phase 0 tab skeleton.
- `scaffold`: `app/(tabs)/*` deviates slightly from PLAN §4's sketch (which shows `insights.tsx` as a flat file) — all four tabs are folders (`index/`, `training/`, `insights/`, `profile/`) each with its own `_layout.tsx` (`Stack`, `headerLargeTitle: true`) + `index.tsx`, so every tab gets a native Large Title header (a flat `insights.tsx` route has no `Stack` ancestor to hang a header on). Functionally equivalent, and matches `training/`/`profile/` already being folders in the plan.
