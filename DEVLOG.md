# DEVLOG – møni

Checklist + log for the lead agent and subagents.
**Rules:** Tick off tasks (`[x]`) as soon as they are done. Append blockers/decisions below the log. Log format: `YYYY-MM-DD · <agent> · what was done / what is open`.
Agents: `lead` (Opus, coordinator/review/commits), `scaffold`, `domain`, `backend` (Sonnet subagents).

---

## Phase 0 – Setup
- [ ] `lead` CLAUDE.md + DEVLOG.md
- [ ] `lead` Git init, .gitignore, GitHub repo `lukaspock/moeni`
- [ ] `lead` Supabase project + MCP config
- [ ] `scaffold` Expo project (TS strict, name `moeni`, bundle id `app.moeni`), app.config.ts, iOS target 26
- [ ] `scaffold` EAS + expo-dev-client, eas.json (development/preview/production)
- [ ] `scaffold` expo-router + NativeTabs skeleton (Today, Training, Insights, Profile) with SF Symbols
- [ ] `scaffold` NativeWind + PlatformColor tokens
- [ ] `scaffold` i18n skeleton (i18next, DE/EN, typed keys, device language)
- [ ] `scaffold` src/lib/supabase.ts (+ MMKV storage), .env.example
- [ ] `scaffold` ESLint + Prettier + Jest (jest-expo) + scripts (test, lint, typecheck)
- [ ] `backend` Migrations for all tables from PLAN §5 incl. RLS, indexes, storage bucket, views
- [ ] `backend` seed.sql exercise catalog (~150 exercises, name_key + MET)
- [ ] `lead` Apply migrations to Supabase, check advisors, generate types
- [ ] `lead` First dev build in the simulator

## Phase 1 – Onboarding, auth, goals
- [ ] `domain` bmr.ts, tdee.ts, targets.ts, macros.ts, met.ts, adaptive.ts, units.ts + tests (PLAN §6)
- [ ] Onboarding flow (MMKV draft)
- [ ] Auth: Apple, Google, email (password + magic link)
- [ ] Save profile, result screen, compute daily_targets

## Phase 2 – Food logging core
- [ ] `backend` Edge Function `analyze-food` (Gemini structured output, limit, plausibility check)
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

## Open items / blockers
- Supabase MCP must be authenticated by the owner (`claude /mcp` in a terminal); after that, restart the session so the lead can apply migrations.
- Decide on the Gemini model + measure its cost (PLAN §10).
- Branding (accent color, icon) is still open.
