-- møni · 004 row level security
--
-- Every table has RLS enabled. Policies use `(select auth.uid())` rather than a bare
-- `auth.uid()` so Postgres can evaluate it once per statement instead of once per row
-- (see Supabase's RLS performance advisor: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).
--
-- Policies are split per-command (select/insert/update/delete) rather than using `for all`,
-- since insert/update need `with check` while select/delete only need `using`, and splitting
-- makes each rule easier to audit.

-- ---------------------------------------------------------------------------
-- profiles — id IS the user id
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy profiles_delete on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Macro: simple owner tables (user_id = auth.uid()), full CRUD for the owner.
-- weight_logs, food_logs, favorite_meals, routines, training_plan_days, workouts
-- ---------------------------------------------------------------------------

alter table public.weight_logs enable row level security;

create policy weight_logs_select on public.weight_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy weight_logs_insert on public.weight_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy weight_logs_update on public.weight_logs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy weight_logs_delete on public.weight_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.food_logs enable row level security;

create policy food_logs_select on public.food_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy food_logs_insert on public.food_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy food_logs_update on public.food_logs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy food_logs_delete on public.food_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.favorite_meals enable row level security;

create policy favorite_meals_select on public.favorite_meals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy favorite_meals_insert on public.favorite_meals
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy favorite_meals_update on public.favorite_meals
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy favorite_meals_delete on public.favorite_meals
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.routines enable row level security;

create policy routines_select on public.routines
  for select to authenticated using ((select auth.uid()) = user_id);
create policy routines_insert on public.routines
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy routines_update on public.routines
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy routines_delete on public.routines
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.training_plan_days enable row level security;

create policy training_plan_days_select on public.training_plan_days
  for select to authenticated using ((select auth.uid()) = user_id);
create policy training_plan_days_insert on public.training_plan_days
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy training_plan_days_update on public.training_plan_days
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy training_plan_days_delete on public.training_plan_days
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.workouts enable row level security;

create policy workouts_select on public.workouts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy workouts_insert on public.workouts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy workouts_update on public.workouts
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy workouts_delete on public.workouts
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- daily_targets / tdee_estimates — client read-only.
-- Written by the client app during Phase 1 (initial compute) via authenticated insert/update
-- for its OWN rows; recompute-targets (cron/service role) bypasses RLS entirely.
-- ---------------------------------------------------------------------------
alter table public.daily_targets enable row level security;

create policy daily_targets_select on public.daily_targets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy daily_targets_insert on public.daily_targets
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy daily_targets_update on public.daily_targets
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy daily_targets_delete on public.daily_targets
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.tdee_estimates enable row level security;

create policy tdee_estimates_select on public.tdee_estimates
  for select to authenticated using ((select auth.uid()) = user_id);
create policy tdee_estimates_insert on public.tdee_estimates
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tdee_estimates_update on public.tdee_estimates
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tdee_estimates_delete on public.tdee_estimates
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- food_items — child of food_logs, ownership checked via EXISTS on the parent.
-- ---------------------------------------------------------------------------
alter table public.food_items enable row level security;

create policy food_items_select on public.food_items
  for select to authenticated
  using (exists (
    select 1 from public.food_logs fl
    where fl.id = food_items.food_log_id and fl.user_id = (select auth.uid())
  ));

create policy food_items_insert on public.food_items
  for insert to authenticated
  with check (exists (
    select 1 from public.food_logs fl
    where fl.id = food_items.food_log_id and fl.user_id = (select auth.uid())
  ));

create policy food_items_update on public.food_items
  for update to authenticated
  using (exists (
    select 1 from public.food_logs fl
    where fl.id = food_items.food_log_id and fl.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.food_logs fl
    where fl.id = food_items.food_log_id and fl.user_id = (select auth.uid())
  ));

create policy food_items_delete on public.food_items
  for delete to authenticated
  using (exists (
    select 1 from public.food_logs fl
    where fl.id = food_items.food_log_id and fl.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- routine_exercises — child of routines
-- ---------------------------------------------------------------------------
alter table public.routine_exercises enable row level security;

create policy routine_exercises_select on public.routine_exercises
  for select to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid())
  ));

create policy routine_exercises_insert on public.routine_exercises
  for insert to authenticated
  with check (exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid())
  ));

create policy routine_exercises_update on public.routine_exercises
  for update to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid())
  ));

create policy routine_exercises_delete on public.routine_exercises
  for delete to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- workout_sets — child of workouts
-- ---------------------------------------------------------------------------
alter table public.workout_sets enable row level security;

create policy workout_sets_select on public.workout_sets
  for select to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_sets.workout_id and w.user_id = (select auth.uid())
  ));

create policy workout_sets_insert on public.workout_sets
  for insert to authenticated
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_sets.workout_id and w.user_id = (select auth.uid())
  ));

create policy workout_sets_update on public.workout_sets
  for update to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_sets.workout_id and w.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_sets.workout_id and w.user_id = (select auth.uid())
  ));

create policy workout_sets_delete on public.workout_sets
  for delete to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_sets.workout_id and w.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- exercises — global catalog (owner_id null) readable by everyone authenticated;
-- own custom exercises (owner_id = auth.uid()) fully manageable. Global rows are
-- managed only via migrations/seed (service role), not by any client policy.
-- ---------------------------------------------------------------------------
alter table public.exercises enable row level security;

create policy exercises_select on public.exercises
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy exercises_insert on public.exercises
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy exercises_update on public.exercises
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy exercises_delete on public.exercises
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_usage / entitlements — client may only READ its own row.
-- All writes happen through Edge Functions using the service role key, which bypasses RLS
-- entirely — so intentionally NO insert/update/delete policy exists here for `authenticated`.
-- ---------------------------------------------------------------------------
alter table public.ai_usage enable row level security;

create policy ai_usage_select on public.ai_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

alter table public.entitlements enable row level security;

create policy entitlements_select on public.entitlements
  for select to authenticated
  using ((select auth.uid()) = user_id);
