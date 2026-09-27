-- møni · 007 functions / RPC
--
-- increment_ai_usage: called by the `analyze-food` Edge Function (using the SERVICE ROLE
-- client) after a successful Gemini call, to atomically bump today's usage counter for the
-- free-tier limit check. `security definer` so it can write `ai_usage` despite RLS having no
-- insert/update policy for `authenticated` there (writes are server-only by design).
-- `set search_path = ''` + fully-qualified names close the classic search_path hijack hole for
-- security definer functions. Execute is revoked from everyone except service_role.

create or replace function public.increment_ai_usage(p_user_id uuid, p_date date)
returns public.ai_usage
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.ai_usage;
begin
  insert into public.ai_usage (user_id, date, count)
  values (p_user_id, p_date, 1)
  on conflict (user_id, date)
  do update set count = public.ai_usage.count + 1
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.increment_ai_usage(uuid, date) is 'Atomically increments (or creates) the ai_usage row for user_id/date. Server-only: called by the analyze-food Edge Function with the service role client.';

revoke all on function public.increment_ai_usage(uuid, date) from public;
revoke all on function public.increment_ai_usage(uuid, date) from authenticated;
revoke all on function public.increment_ai_usage(uuid, date) from anon;
grant execute on function public.increment_ai_usage(uuid, date) to service_role;

-- ---------------------------------------------------------------------------
-- get_ai_usage_today: convenience read helper mirroring the same lockdown pattern, so the
-- edge function doesn't need a second round-trip using a raw select bypassing RLS. Optional —
-- the edge function may also just `select` directly with the service role client, which
-- bypasses RLS anyway. Kept for symmetry / potential future client-safe use (NOT granted to
-- authenticated on purpose, since ai_usage should stay authoritative server-side).
-- ---------------------------------------------------------------------------
create or replace function public.get_ai_usage_count(p_user_id uuid, p_date date)
returns integer
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(count, 0) from public.ai_usage where user_id = p_user_id and date = p_date;
$$;

revoke all on function public.get_ai_usage_count(uuid, date) from public;
revoke all on function public.get_ai_usage_count(uuid, date) from authenticated;
revoke all on function public.get_ai_usage_count(uuid, date) from anon;
grant execute on function public.get_ai_usage_count(uuid, date) to service_role;
