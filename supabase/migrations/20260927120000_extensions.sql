-- møni · 001 extensions
-- Enables the Postgres extensions used across the schema.
-- pgcrypto: gen_random_uuid() for server-side default IDs (client may still send its own UUID on insert/upsert).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- pg_cron and pg_net (needed for the weekly recompute-targets job) are enabled in the
-- dedicated cron migration (20260927120800_cron_recompute_targets.sql), not here, since on
-- hosted Supabase they are project-level extensions best kept isolated from the core schema
-- migrations (so a cron setup hiccup never blocks table/RLS migrations from applying).
