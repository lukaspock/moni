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
Expo (Dev Build via EAS, **not Expo Go**) · TypeScript strict · expo-router (NativeTabs, Native Stack) · NativeWind (layout only) · expo-glass-effect / @expo/ui/swift-ui / expo-symbols (native Liquid Glass) · Supabase (Auth, Postgres + RLS, Storage, Edge Functions/Deno, pg_cron) · TanStack Query · Zustand · MMKV · react-hook-form + zod · i18next · victory-native / Skia · RevenueCat · HealthKit (`@kingstinct/react-native-healthkit`) · Jest.
iOS deployment target **26**. Platform: iOS only.

## Infrastructure
- **GitHub**: `lukaspock/moeni` (private). Default branch `main`.
- **Supabase**: project ref `ehjqlatmgvytnzftmkgg` (URL `https://ehjqlatmgvytnzftmkgg.supabase.co`), configured as the project MCP in `.mcp.json`. The owner must authenticate the MCP once with `claude /mcp`.
- Secrets (Gemini key, RevenueCat secret, service role) **only** as Supabase secrets, never in the client or the repo. Client env lives in `.env` (gitignored) with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; template in `.env.example`.

## Folder structure
```
app/                 expo-router routes (see PLAN.md §4)
src/domain/          PURE calculation logic (no RN/Expo imports) + *.test.ts
src/features/        food/, workout/, targets/, insights/, health/, subscription/
src/lib/             supabase.ts, storage.ts (MMKV), units.ts, outbox.ts
src/i18n/            index.ts (language registry) + locales/{de,en}.json
src/components/      glass/, ui/, charts/
src/types/database.ts  generated (do not edit by hand)
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

## Commands
```bash
npm install
npx expo start --dev-client     # after the dev build
npx expo run:ios                # local dev build (simulator)
npm test                        # Jest (domain logic)
npm run lint && npm run typecheck
```
Supabase migrations/types/functions currently run through the Supabase MCP (`apply_migration`, `generate_typescript_types`, `deploy_edge_function`). The Supabase CLI is not installed yet.

## Setup status
- [x] PLAN.md, CLAUDE.md, DEVLOG.md
- [x] Supabase project created, MCP in `.mcp.json`
- [ ] Supabase MCP authenticated (owner: `claude /mcp`)
- [ ] Git + GitHub repo
- [ ] Expo scaffold (Phase 0)
