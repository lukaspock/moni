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
| `docs/` | Owner-facing reports in German (e.g. `docs/sprint-2.md`: sprint summary, merge order, iPhone setup, open bugs, owner to-dos). One file per sprint. |

## Stack (short)
Expo SDK 57 (`expo` 57.0.25, RN 0.86.3, React 19.2.3; Dev Build via EAS, **not Expo Go**) · TypeScript strict · expo-router (`NativeTabs` from `expo-router/unstable-native-tabs`, Native Stack) · NativeWind v4.2 **+ Tailwind v3.4** (v4 not yet supported by this NativeWind line, see DEVLOG open items) — layout only · expo-glass-effect / @expo/ui/swift-ui / expo-symbols (native Liquid Glass) · Supabase (Auth, Postgres + RLS, Storage, Edge Functions/Deno, pg_cron) · TanStack Query · Zustand · react-native-mmkv v4 (`createMMKV()` factory API) · react-hook-form + zod · i18next · victory-native / Skia · RevenueCat · HealthKit (`@kingstinct/react-native-healthkit` v16, Nitro-based) · expo-notifications · Jest (`jest-expo`).
iOS deployment target **26** (via `expo-build-properties`). Platform: iOS only.

## Infrastructure
- **GitHub**: `lukaspock/moeni` (private). Default branch `main`.
- **Supabase**: region `eu-west-1` (Ireland; EU, not Frankfurt as in PLAN), project ref `ehjqlatmgvytnzftmkgg` (URL `https://ehjqlatmgvytnzftmkgg.supabase.co`), configured as the project MCP in `.mcp.json`. The owner must authenticate the MCP once with `claude /mcp`.
- Secrets (Gemini key, RevenueCat secret, service role) **only** as Supabase secrets, never in the client or the repo. Client env lives in `.env` (gitignored) with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; template in `.env.example`.

## Folder structure
```
app/                 expo-router routes (see PLAN.md §4)
  _layout.tsx         root: QueryClientProvider, i18n init, GestureHandler/SafeArea, Stack
  (tabs)/_layout.tsx   NativeTabs (index/training/insights/profile), SF Symbols
  (tabs)/<tab>/        each tab is its own folder: _layout.tsx (Stack, headerLargeTitle) + index.tsx
src/domain/          PURE calculation logic (no RN/Expo imports) + *.test.ts
src/features/        auth/, food/, workout/, targets/, health/ (contract), notifications/, insights/, subscription/
src/theme/           colors.ts — themeColor()/platformColorName()/useThemeHex() over theme.config.js
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
- `src/domain/` is complete for Phase 1 (bmr, tdee, targets, macros, met, adaptive, units, mealType, food, onboarding, projection, types, barrel `index.ts`), all pure functions with `*.test.ts` next to them, verified with `bun test src/domain` (Jest-compatible API — no bun-specific APIs, no `jest.mock`, so `npm test` with jest-expo will run the same files unchanged).
- Unit-conversion math (kg/lb, cm/ft-in, km/mi) lives in `src/domain/units.ts`, not `src/lib/units.ts` (PLAN §4 sketch) — hard rule #3 puts calculation logic in `src/domain`. `src/lib/units.ts`, when added, should re-export/format `src/domain/units.ts` for display rather than reimplement it.
- `targets.ts` exposes `calculateWorkoutBonus` for the §6.4 dynamic daily limit (provisional vs. actual bonus, eat-back factor); `macros.ts::calculateMacros` must be called with the **total** daily limit (base + workout bonus), not just base_kcal, so the bonus flows mostly into carbs as PLAN §6.4 specifies.

## Backend
- Full details, apply order and secrets checklist: `supabase/README.md`.
- **Enums** are modelled as `text` + `CHECK (... in (...))`, not Postgres `enum` types (easier to extend later, maps directly to TS string-literal unions).
- **RLS pattern**: every table has RLS enabled; policies always use `(select auth.uid())` (not a bare `auth.uid()`) for the performance advisor, split per-command (select/insert/update/delete). Child tables (`food_items`, `routine_exercises`, `workout_sets`) check ownership via `EXISTS` against their parent row. `exercises`: `owner_id is null` = global catalog (readable by all authenticated, not writable by clients), `owner_id = auth.uid()` = user's own, fully manageable. `ai_usage`/`entitlements` are **client read-only**; all writes go through Edge Functions using the service role key (bypasses RLS) — do not add client insert/update policies for those two tables.
- **Views** `v_daily_summary` / `v_exercise_progress` are created `with (security_invoker = true)` so they inherit the querying user's RLS.
- **Secrets** (set as Supabase Edge Function secrets, never in the repo): `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-2.5-flash`), `FREE_AI_LIMIT_PER_DAY` (default `3`), `REVENUECAT_WEBHOOK_SECRET`. `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` are auto-injected per function.
- **`revenuecat-webhook` must deploy with `verify_jwt = false`** (shared-secret auth instead of a Supabase JWT) — see `supabase/config.toml` and the function's own header comment.
- `supabase/functions/_shared/adaptive.ts` is a verbatim copy of `src/domain/adaptive.ts` (Deno can't import `src/`; only the `KCAL_PER_KG` import differs) — edit the domain file, re-copy, `src/domain/adaptive.sync.test.ts` fails on drift. `_shared/formula.ts` ports BMR/NEAT TDEE by hand.
- `recompute-targets` (Phase 6) writes `tdee_estimates` (adaptive TDEE, weekly cron + client `useRecomputeTargetsIfDue()` in `src/features/targets`); `useDailyTargets` uses the latest `blended_tdee`. Details: `supabase/README.md`.

## Commands
```bash
npm install
npx expo start --dev-client     # after the dev build
npx expo run:ios                # local dev build (simulator)
npm test                        # Jest (domain logic)
npm run lint && npm run typecheck
```
Supabase via **CLI** (installed, logged in, linked to `ehjqlatmgvytnzftmkgg`):
```bash
supabase db push --linked --dry-run          # ALWAYS preview first
supabase db push --linked                    # apply migrations
supabase gen types typescript --linked > src/types/database.ts && npx prettier --write src/types/database.ts
supabase db advisors --linked                # must return "No issues found" after every migration
supabase functions deploy --project-ref ehjqlatmgvytnzftmkgg --use-api
```
New migrations: always as a new file `supabase/migrations/<timestamp>_<name>.sql`, never edit an applied migration.
`.npmrc` sets `legacy-peer-deps=true` — required on this SDK 57 / React 19 combo (`npm install`/`npm ci` ERESOLVE otherwise on a transitive `react-dom` peer nothing here actually uses).

## iOS build (important)
- **Real project path is `~/Documents/moeni`** (ASCII). `~/Documents/møni` is only a symlink. CocoaPods/Ruby fails on the "ø" in the path, so always build from `moeni`.
- Start with a UTF-8 locale: `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios`
- Xcode 27 / iOS 27 SDK requires the UIScene life cycle. Expo SDK 57's template does not have it yet → local config plugin `plugins/withSceneLifecycle.js` (uses `EXExpoAppSceneDelegate`). **Remove it once we upgrade to SDK 58.**
- `react-native-mmkv` v4 needs `react-native-nitro-modules` (installed).
- The generated Xcode project/scheme is named **`mni`** (the "ø" is stripped): `ios/mni.xcworkspace`, scheme `mni`.
- **Physical device on a free Apple ID (personal team)**: `plugins/withoutPushEntitlement.js` strips `aps-environment` (personal teams can't sign Push; we only use local notifications — remove the plugin once we have a paid account + remote push). HealthKit signs fine. Team id comes from env, never commit it:
  ```bash
  export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 APPLE_TEAM_ID=<team id>   # defaults read com.apple.dt.Xcode IDEProvisioningTeamByIdentifier
  npx expo prebuild --platform ios --clean
  xcodebuild -workspace ios/mni.xcworkspace -scheme mni -configuration Debug -destination id=<UDID> -derivedDataPath ios/build/device -allowProvisioningUpdates DEVELOPMENT_TEAM=$APPLE_TEAM_ID build
  xcrun devicectl device install app --device <UDID> ios/build/device/Build/Products/Debug-iphoneos/mni.app
  ```
  First launch: on the phone, Settings → General → VPN & Device Management → trust the developer app. Free-team profiles expire after 7 days → rebuild/reinstall. Then `npx expo start --dev-client` (phone + Mac on the same Wi-Fi) and scan the QR code.

## Theme / brand colors
- **Brand colors live in `theme.config.js`** (root, CommonJS): `accent` (mint, `systemMint`), `bonus` (orange, workout-bonus segment), `danger` (red). Each has an iOS semantic `platform` name + `light`/`dark` hex. Changing that file alone re-colors the app:
  - NativeWind tokens `tint` / `bonus` / `destructive` (`tailwind.config.js` requires it) → use `text-tint`, `bg-tint`, `bg-destructive` …
  - `src/theme/colors.ts`: `themeColor(name)` (PlatformColor, for RN styles/`SymbolView tintColor`/`Switch trackColor`), `platformColorName(name)` (raw iOS name), `useThemeHex(name)` (scheme-aware hex for Skia).
  - `plugins/withAccentColor.js` writes the accent as the iOS `AccentColor` asset + global accent build setting, so default-tinted native controls (@expo/ui Slider/DatePicker/Stepper, NativeTabs, UIKit) follow it — needs a prebuild/native rebuild to take effect.
- Never hardcode `systemBlue`/`#007AFF`/`systemRed`/hex brand colors in components; use the helpers. Neutral iOS semantic colors (`secondaryLabel`, `label` …) are fine as-is.

## Feature architecture
- Features live in `src/features/<feature>/`. **`index.ts` is the public contract** (hooks + types); other features import only from there. Contract signatures only change after coordinating with the lead.
- Data: TanStack Query directly against Supabase (typed client `src/lib/supabase.ts`). Workouts additionally offline via MMKV + outbox (`src/lib/outbox.ts`).
- Dates as local `YYYY-MM-DD` strings (`src/lib/date.ts`).
- i18n per feature: `src/i18n/locales/<lang>/<feature>.json` → `t('<feature>.…')`. Base texts (common, tabs) in `<lang>.json`. Exercise names: `t('exercise.<key>')`.
- Modal routes are registered centrally in `app/_layout.tsx` (log-food, barcode-scanner, food-review, exercise-picker, workout/*).
- **Auth gate** (`app/_layout.tsx`): `Stack.Protected` (available in this expo-router line, `~57.0.23`) wraps `(tabs)`/`(onboarding)`/`(auth)` with boolean guards derived from `useSession()`, `useProfile()` (+ `isProfileComplete`) and the persisted onboarding store flags (`completed`, `wantsSignIn`, `appliedToProfile`). Signed out: `(onboarding)` until the flow is finished, `(auth)` once finished *or* after Welcome's "I already have an account" (`wantsSignIn`). Signed in: the **gate itself** writes a finished, not-yet-applied draft via `applyOnboardingDraftToProfile` (shows `ApplyingProfileScreen` with retry; never overwrites an existing complete profile → returns `'skippedExisting'`), then `(tabs)` if the profile is complete, else `(onboarding)` (new account without answers). A failed profile fetch (offline) falls back to `(tabs)`. The sign-in screen does no navigation/profile writes. Only the gate logic in that file is shared/editable across agents; the modal `Stack.Screen` registrations are a separate, stable block.
- **Onboarding v2** (`app/(onboarding)/*`, `src/features/auth/`): step order lives in pure `onboardingFlow.ts` (`ONBOARDING_STEPS`, `nextOnboardingStep`, `onboardingProgress`; target-weight/rate skipped for maintain, health primer skipped when `isHealthAvailable()` is false) — screens call `useOnboardingNavigation(step).goNext()` / `.advanceSoon()` (single-choice auto-advance, 380 ms) instead of hardcoding routes; the last step calls `finishOnboarding()` → sign-up. Order: welcome → name → motivation → sex → birth-date → body → activity → goal → target-weight → rate → experience → schedule → diet → disclaimer → calculating → result → health → notifications → sign-up (activity moved before goal so target/rate screens show real kcal + dates). Shared UI in `src/features/auth/components/` (`OnboardingScreen`, `ChoiceStep`, `OptionCard` w/ SF Symbol + pop, `CountUpText`, `WeightProjectionChart` (Skia, self-drawing line), `GlassButton` `variant: 'secondary'`); the thin progress bar is rendered once in `app/(onboarding)/_layout.tsx` over the transparent header. All Reanimated entering/layout animations rely on the default `ReduceMotion.System`; `CountUpText` checks `useReducedMotion()`. Live numbers come from `useDraftProjection()` → `src/domain/onboarding.ts::computeGoalProjection` (+ `src/domain/projection.ts`: BMI bounds, target suggestion/validation, pace, weeks/date, curve). Draft store is persisted with `version: 1` + `migrate`/deep `merge`, so older drafts get new fields filled from `initialOnboardingDraft` — **bump the version and extend `hydrate()` when adding fields**.
- **Notifications contract (`src/features/notifications/index.ts`, owner `onboarding`)**: local-only meal reminders via expo-notifications. `getReminderPermission()`/`requestReminderPermission()` → `'granted'|'denied'|'undetermined'`; `scheduleMealReminders(reminders = DEFAULT_MEAL_REMINDERS)` (DAILY triggers 09:00/13:00/19:30, identifiers `moeni-meal-*`, content localized via `notifications.meal.*` at schedule time — call again after a language change); `cancelMealReminders()` (only ours, rest timers untouched); `useMealReminders(): { enabled, setEnabled(v): Promise<boolean> }` (device-local MMKV flag, asks permission + schedules on enable). No foreground `setNotificationHandler` is installed (reminders only show while the app is backgrounded).
- **Onboarding draft pattern**: multi-step wizards that must survive app restarts before sign-up use a Zustand store with the `persist` middleware backed by MMKV (`createJSONStorage(() => ({ getItem/setItem/removeItem via src/lib/storage }))`), not a raw MMKV read — Zustand's reactivity is what lets `app/_layout.tsx`'s gate re-render when a flag flips (see `src/features/auth/onboardingStore.ts`). Same pattern to reuse for any other pre-auth or cross-screen draft state.
- **`@expo/ui/swift-ui` (`~57.0.20`) inventory actually available**: `Host`, `Button` (`buttonStyle('glassProminent' | 'glass' | …)` for native Liquid Glass CTAs, iOS 26+), `Picker` (`pickerStyle('segmented')` + `Text` children with a `tag(...)` modifier — good for 2–4-option toggles), `DatePicker`, `Slider`, `Stepper`, `Toggle`, `Form`/`Section`/`List` for native grouped lists. No component/modifier here was found missing for the account screens; `TextField` exists but uses an `ObservableState`/`useNativeState` pattern — plain RN `TextInput` + NativeWind was used instead for free-text numeric entry (simpler, and an explicitly allowed fallback per PLAN §2). Large-tap-target multi-choice lists (sex/activity/goal/weekday pickers) also use plain RN `Pressable`+NativeWind/PlatformColor — no native SwiftUI control fits a chunky icon+label choice card as well.
- i18next's typed `t()` keys don't support template-literal interpolation (`` t(`account.x.${day}`) `` fails to typecheck) — build a small `Record<number, string>` of literal `t('account.x.0')…t('account.x.6')` calls instead (see `app/(onboarding)/schedule.tsx`, `app/(tabs)/profile/index.tsx`). Several other in-progress screens have the same unresolved pattern (not fixed here — out of this agent's file area).
- **Cross-screen draft state without URL params**: a plain (non-persisted) Zustand store passes state between a chain of modal routes that build up one record together — e.g. `log-food` → `barcode-scanner`/`analyze-food` → `food-review` all share `src/features/food/draftStore.ts`. Reset the store with a `start(...)` action when the chain begins, read the fresh value via `store.getState()` right after calling an action that changes it (a just-called setter's effect isn't visible through a `useStore(selector)` value until the next render), not via a stale render-scoped variable. Only pass an actual identifier (e.g. `editFoodLogId`) as a route param, not the payload itself.
- **Skia (`@shopify/react-native-skia`) canvases can't take RN's `PlatformColor(...)`** as a paint color — its `Color` prop type doesn't accept the `OpaqueColorValue` opaque handle (confirmed via `tsc`), only concrete strings/`Float32Array`s. Any Skia-drawn chart (see `src/components/charts/KcalRing.tsx`) therefore needs hardcoded color values and won't auto-adapt to Dark Mode the way `PlatformColor`-based NativeWind tokens do; plain RN views (bars, tracks) keep using the `tailwind.config.js` tokens as normal.
- **Health contract (`src/features/health/index.ts`, owner `health`)**: `isHealthAvailable(): boolean`, `requestHealthAuthorization(): Promise<'granted'|'denied'|'unavailable'>`, `useHealthSettings(): { enabled, writeNutrition, setEnabled, setWriteNutrition }` (device-local, MMKV-persisted Zustand store `settingsStore.ts`), `useHealthSync(): { syncNow(), isSyncing, lastSyncedAt }`. Reads workouts/activeEnergyBurned/bodyMass, writes workouts (+ dietaryEnergyConsumed & macros if `writeNutrition`); imports on app start/foreground, dedupe via the unique `healthkit_uuid` on `workouts` and `weight_logs`. HealthKit plugin runs with `background: false` (no background delivery). Implementation details: see "Apple Health" below.
- **Apple Health (`src/features/health/`, Phase 5)**:
  - *Files*: `healthkit.ts` (lazy `require` of `@kingstinct/react-native-healthkit` — the lib creates Nitro objects at import time and would crash a binary without the native module; everything goes through `getHealthKit()`), `mappers.ts` (pure + tested: category mapping, loop prevention, overlap/import planning, deterministic ids, body-mass mapping, throttle), `sync.ts` (import), `export.ts` (write-back), `index.ts` (contract + `useHealthAutoSync`, `useActiveEnergyForDate`). The pure file imports enums from `@kingstinct/react-native-healthkit/types` only (side-effect-free, works in jest).
  - *Import*: anchored queries per user/type, anchor in MMKV `health:anchor:<userId>:workouts|bodyMass`, advanced only after the batch's writes succeeded/were queued. First sync: last 30 days. Triggered by `useHealthAutoSync()` (mounted once in `app/(tabs)/_layout.tsx`: on mount + AppState `active`, ≥5 min apart, only when enabled + signed in) and by `useHealthSync().syncNow()` (no throttle). After a run, TanStack keys `latestWeight`, `workout`, `targets`, `health` are invalidated; `useWorkoutsForDate`/history refresh via the outbox listener.
  - *Workouts* go through the **outbox** (upsert on `id`) with a **deterministic id** = v5-style UUID from SHA-1(`moeni:healthkit-workout:<userId>:<hkUuid>`) (`expo-crypto`) + `healthkit_uuid` — idempotent re-imports, and a HealthKit deletion maps to a row id without a lookup. Category from `HKWorkoutActivityType`; kcal = workout's ActiveEnergyBurned statistic (fallback `totalEnergyBurned`), `kcal_source 'healthkit'`; no energy in Health → MET estimate via `src/domain/met` (`kcal_source 'met'`).
  - *Double counting (PLAN §6.5)*: `planWorkoutImport` — a Health workout overlapping (≥50 % of the shorter one) a møni-recorded workout is **merged** into that row (Health's kcal, `kcal_source 'healthkit'`, `healthkit_uuid` set; full row re-upserted because the outbox's INSERT half needs all NOT NULL columns), never inserted as a second workout; one overlapping an already Health-linked row (e.g. Watch + Strava) is skipped. Imported workouts are ordinary completed `workouts` rows, so they count toward the actual workout bonus in `useDailyTargets` automatically. Only workouts are imported — daily active energy (NEAT) is never added to the bonus.
  - *Loop prevention*: møni's own samples are skipped by source bundle id (`currentAppSource()`) **or** the custom metadata keys `moeni_workout_id` / `moeni_food_log_id` that every write carries.
  - *Deletions*: deleted imported workouts → `enqueueDelete` (only if the deterministic id exists on server/outbox); a deleted Health workout that was *merged* leaves the møni workout (and its Health kcal) as is. Deleted weights → deleted by `healthkit_uuid`.
  - *Weights*: body mass → `weight_logs` (`source 'healthkit'`, local `date` via `toISODate`) with `upsert(..., { onConflict: 'healthkit_uuid', ignoreDuplicates: true })` (HK samples are immutable). Every sample is imported (a scale can produce several rows per day).
  - *Write-back*: `exportWorkoutToHealth` (called from `finishActiveWorkout` and `logCardioWorkout`) and `exportFoodLogToHealth` / `deleteFoodLogFromHealth` (from `useSaveFoodDraft` / `useDeleteFoodLog`) — all fire-and-forget, guarded by the settings store, never throw, never touch Supabase. Food = 4 dietary quantity samples, each with `HKMetadataKeySyncIdentifier = moeni:food:<id>:<nutrient>` + time-based `HKMetadataKeySyncVersion` (edits replace, deletes filter on it).
  - *Permissions*: HealthKit never reveals read denial — `'granted'` only means the sheet completed. Toggle-on in the settings screen always re-runs `requestHealthAuthorization()`. Settings UI: `app/(tabs)/profile/health.tsx`.
- **Offline outbox (`src/lib/outbox.ts` + pure `src/lib/outboxQueue.ts`)**: after writing a row to local/Zustand state, call `enqueueUpsert(table, id, payload)` (payload's own `id` is added automatically) or `enqueueDelete(table, id)` — don't await it, it's fire-and-forget and syncs in the background. Only `workouts`, `workout_sets`, `routines`, `routine_exercises`, `exercises` go through it (all keyed by a single `id` PK); a table keyed on something else, like `training_plan_days` on `(user_id, weekday)`, gets upserted directly against Supabase instead (see `src/features/workout/plan.ts`). Repeated upserts of the same row before it syncs are merged (shallow field merge, keeps FIFO order); a queued delete replaces a pending upsert outright. `pendingUpsertsForTable(table)` / `pendingDeleteIdsForTable(table)` let a read hook overlay not-yet-synced local rows onto a Supabase query result (see `useWorkoutsForDate`'s "incl. unsynced offline ones" in its contract). Sync is triggered by `NetInfo` connectivity + `AppState` foreground, and (since this feature can't touch `app/_layout.tsx`) on first import of `@/lib/outbox` — fires once any workout screen is reached, not strictly at cold start; a stricter guarantee would need one `import '@/lib/outbox'` in the root layout. On failure, an entry gets exponential backoff (`computeBackoffMs`, capped, deterministic/no jitter) and after 8 attempts is dropped with a `console.warn` rather than blocking the queue forever. Processing stops at the first still-failing entry per run (not skip-ahead) so FK-dependent rows queued later (e.g. `workout_sets` referencing a not-yet-synced `workouts` row) never race ahead of their parent.
- **React-Compiler-era ESLint rules** (`eslint-plugin-react-hooks` v6, already active in this config): `react-hooks/set-state-in-effect` flags *any* `setState` call written directly at an effect's top level (not inside a nested/async function the effect calls) — including the common "if (!id) { setX([]); return; }" guard. Fix by returning early from the effect *without* setting state, and instead branching on the same condition in the hook's own return statement (see `useWorkoutsForDateImpl` in `src/features/workout/history.ts`); move a leading `setIsLoading(true)` inside the async loader function instead of before calling it. `react-hooks/purity` flags impure calls (like `Date.now()`) as a `useState` initializer argument — use the lazy form `useState(() => Date.now())` instead.

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
- [x] First dev build running in the simulator (iPhone 18 Pro, 2026-09-27)
- [x] Dev build installed on the owner's iPhone 15 via free personal team (2026-09-29, local `integration/sprint-2`; see "iOS build" above)
