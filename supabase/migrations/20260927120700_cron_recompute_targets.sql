-- møni · 008 pg_cron: weekly recompute-targets job (PLAN.md §6.7 / Phase 6)
--
-- *** ACTION REQUIRED FROM THE PROJECT OWNER/LEAD BEFORE (or right after) THIS MIGRATION ***
-- This job calls the `recompute-targets` Edge Function over HTTP using `pg_net`, authenticated
-- with the service role key. The key must NOT be hardcoded into a migration file (migrations
-- are plain SQL committed to the repo). Instead it is stored once in Supabase Vault:
--
--   select vault.create_secret(
--     '<the service_role key from Project Settings -> API>',
--     'service_role_key',
--     'Service role key used by pg_cron to call recompute-targets'
--   );
--
-- The project's function base URL is inserted directly below (it is not a secret) — replace
-- `https://ehjqlatmgvytnzftmkgg.supabase.co` if the project ref ever changes
-- (see CLAUDE.md "Infrastructure").
--
-- If `vault.create_secret` / `vault` schema is unavailable on the plan, store the key as a
-- Postgres setting instead (`alter database postgres set app.service_role_key = '...'`) and
-- swap the lookup in `public.trigger_recompute_targets()` accordingly — see comment inline.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Wrapper function: reads the service role key from Vault and POSTs to the Edge Function.
-- security definer + locked search_path since it reads from vault.decrypted_secrets.
-- ---------------------------------------------------------------------------
create or replace function public.trigger_recompute_targets()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service_key text;
  v_url text := 'https://ehjqlatmgvytnzftmkgg.supabase.co/functions/v1/recompute-targets';
begin
  -- TODO(lead): confirm this select against vault.decrypted_secrets works on the project's
  -- plan; if Vault is unavailable, replace with:
  --   v_service_key := current_setting('app.service_role_key', true);
  select decrypted_secret into v_service_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if v_service_key is null then
    raise warning 'trigger_recompute_targets: service_role_key not found in Vault, skipping call';
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
end;
$$;

revoke all on function public.trigger_recompute_targets() from public;
revoke all on function public.trigger_recompute_targets() from authenticated;
revoke all on function public.trigger_recompute_targets() from anon;
-- pg_cron runs scheduled jobs as the database owner (postgres), so no extra grant needed there.

-- ---------------------------------------------------------------------------
-- Schedule: every Monday at 03:00 UTC. recompute-targets itself iterates over all eligible
-- users (see supabase/functions/recompute-targets/index.ts) rather than being called per-user.
-- ---------------------------------------------------------------------------
select cron.schedule(
  'recompute-targets-weekly',
  '0 3 * * 1',
  $$ select public.trigger_recompute_targets(); $$
);

-- To inspect/unschedule later:
--   select * from cron.job;
--   select cron.unschedule('recompute-targets-weekly');
