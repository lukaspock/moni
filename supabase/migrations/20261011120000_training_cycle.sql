-- ---------------------------------------------------------------------------
-- Training cycle: the plan is a cycle of N days (1–14, default 7), each day a
-- routine or rest, repeating from `anchor_date`. "Heute nicht" / "Doch
-- trainieren" are stored as an ordered event log (`training_plan_shifts`) and
-- replayed client-side (src/domain/trainingCycle.ts). Saving the cycle resets
-- the anchor and clears the log.
--
-- `training_plan_days` stays for now (not dropped) but is no longer read for
-- the plan once a user has a cycle.
-- ---------------------------------------------------------------------------

create table public.training_cycles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  length smallint not null default 7 check (length between 1 and 14),
  anchor_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.training_cycles
  for each row execute function public.set_updated_at();

-- One row per cycle position. kind 'training' with routine_id null = "next
-- routine in the rotation" (also what a deleted routine falls back to).
create table public.training_cycle_slots (
  user_id uuid not null references auth.users (id) on delete cascade,
  position smallint not null check (position between 0 and 13),
  kind text not null check (kind in ('training', 'rest')),
  routine_id uuid references public.routines (id) on delete set null,
  primary key (user_id, position),
  constraint training_cycle_slots_rest_without_routine
    check (kind = 'training' or routine_id is null)
);

create index training_cycle_slots_routine_idx on public.training_cycle_slots (routine_id);

-- id is client-generated (idempotent retry, undo deletes by id).
create table public.training_plan_shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('postpone', 'pullForward')),
  created_at timestamptz not null default now()
);

create index training_plan_shifts_user_date_idx on public.training_plan_shifts (user_id, date);

-- ---------------------------------------------------------------------------
-- RLS: plain owner tables, split per command, `(select auth.uid())`.
-- ---------------------------------------------------------------------------
alter table public.training_cycles enable row level security;

create policy training_cycles_select on public.training_cycles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy training_cycles_insert on public.training_cycles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy training_cycles_update on public.training_cycles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy training_cycles_delete on public.training_cycles
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.training_cycle_slots enable row level security;

create policy training_cycle_slots_select on public.training_cycle_slots
  for select to authenticated using ((select auth.uid()) = user_id);
-- routine_id must be one of the user's own routines (no cross-user references).
create policy training_cycle_slots_insert on public.training_cycle_slots
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and (routine_id is null or exists (select 1 from public.routines r where r.id = routine_id and r.user_id = (select auth.uid())))
  );
create policy training_cycle_slots_update on public.training_cycle_slots
  for update to authenticated using ((select auth.uid()) = user_id) with check (
    (select auth.uid()) = user_id
    and (routine_id is null or exists (select 1 from public.routines r where r.id = routine_id and r.user_id = (select auth.uid())))
  );
create policy training_cycle_slots_delete on public.training_cycle_slots
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.training_plan_shifts enable row level security;

create policy training_plan_shifts_select on public.training_plan_shifts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy training_plan_shifts_insert on public.training_plan_shifts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy training_plan_shifts_update on public.training_plan_shifts
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy training_plan_shifts_delete on public.training_plan_shifts
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Backfill: every user with training weekdays gets a 7-day cycle anchored on
-- the Monday of the current week (date_trunc('week') = Monday). Position 0 =
-- Monday … 6 = Sunday; training_plan_days.weekday is 0 = Sunday … 6 = Saturday,
-- so position = (weekday + 6) % 7. Training days get the user's routines
-- (oldest first, the app's order) round-robin in Monday-first order; an
-- already linked training_plan_days.routine_id wins. No routines → null
-- (= rotation).
-- ---------------------------------------------------------------------------
insert into public.training_cycles (user_id, length, anchor_date)
select distinct tpd.user_id, 7, date_trunc('week', current_date)::date
from public.training_plan_days tpd
on conflict (user_id) do nothing;

with days as (
  select
    tpd.user_id,
    (tpd.weekday + 6) % 7 as position,
    tpd.routine_id,
    row_number() over (partition by tpd.user_id order by (tpd.weekday + 6) % 7) - 1 as k
  from public.training_plan_days tpd
),
ordered_routines as (
  select
    r.id,
    r.user_id,
    row_number() over (partition by r.user_id order by r.created_at, r.id) - 1 as idx,
    count(*) over (partition by r.user_id) as cnt
  from public.routines r
)
insert into public.training_cycle_slots (user_id, position, kind, routine_id)
select
  c.user_id,
  p.position,
  case when d.user_id is null then 'rest' else 'training' end,
  case when d.user_id is null then null else coalesce(d.routine_id, o.id) end
from public.training_cycles c
cross join generate_series(0, 6) as p(position)
left join days d on d.user_id = c.user_id and d.position = p.position
left join ordered_routines o
  on o.user_id = c.user_id and d.k is not null and o.idx = d.k % o.cnt
on conflict (user_id, position) do nothing;
