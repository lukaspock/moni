-- ---------------------------------------------------------------------------
-- water_logs: one row per drink (glass/bottle) logged from Today's water card.
-- Metric only (ml); fl oz is a display concern (src/domain/water.ts).
-- id is client-generated (idempotent retry of an offline insert).
-- ---------------------------------------------------------------------------
create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  logged_at timestamptz not null default now(),
  ml integer not null check (ml > 0 and ml <= 5000),
  created_at timestamptz not null default now()
);

create index water_logs_user_date_idx on public.water_logs (user_id, date);

alter table public.water_logs enable row level security;

create policy water_logs_select on public.water_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy water_logs_insert on public.water_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy water_logs_update on public.water_logs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy water_logs_delete on public.water_logs
  for delete to authenticated using ((select auth.uid()) = user_id);
