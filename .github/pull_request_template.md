## Summary

<!-- What does this PR change and why? Link the PLAN.md section / DEVLOG item. -->

## Checklist

- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass locally
- [ ] Core flows checked in the iOS simulator (dev build) — or N/A (no app change)
- [ ] Migrations: new file in `supabase/migrations/` (no edits to applied ones), applied (`supabase db push --linked`), `supabase db advisors --linked` clean, types regenerated in `src/types/database.ts` — or N/A
- [ ] i18n: every new UI string has keys in **de** and **en**
- [ ] `CLAUDE.md` updated (architecture/conventions/commands) and `DEVLOG.md` ticked + log line added
- [ ] No secrets in client code or the repo

## Notes for reviewers

<!-- Risks, follow-ups, screenshots. -->
