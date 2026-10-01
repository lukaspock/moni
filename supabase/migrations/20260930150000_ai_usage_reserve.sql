-- møni · SEC-1: atomic free-tier AI quota.
-- analyze-food used to read ai_usage, call Gemini, and only then increment, so parallel
-- requests all passed the check (race) and requests that failed after the Gemini call
-- (label_not_readable 422) were never counted. The quota is now reserved atomically BEFORE
-- the Gemini call and refunded only when the call never produced a billable result.

-- Returns the new count, or NULL when p_limit is set and already reached (nothing written).
-- p_limit NULL = unlimited (premium): just counts.
create or replace function public.reserve_ai_usage(p_user_id uuid, p_date date, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_limit is not null and p_limit <= 0 then
    return null;
  end if;

  insert into public.ai_usage (user_id, date, count)
  values (p_user_id, p_date, 1)
  on conflict (user_id, date)
  do update set count = public.ai_usage.count + 1
  where p_limit is null or public.ai_usage.count < p_limit
  returning count into v_count;

  return v_count;
end;
$$;

-- Gives one reserved unit back (never below 0). Used when Gemini/storage failed.
create or replace function public.refund_ai_usage(p_user_id uuid, p_date date)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
  set count = greatest(count - 1, 0)
  where user_id = p_user_id and date = p_date;
$$;

revoke all on function public.reserve_ai_usage(uuid, date, integer) from public, authenticated, anon;
revoke all on function public.refund_ai_usage(uuid, date) from public, authenticated, anon;
grant execute on function public.reserve_ai_usage(uuid, date, integer) to service_role;
grant execute on function public.refund_ai_usage(uuid, date) to service_role;
