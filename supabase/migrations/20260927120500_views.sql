-- møni · 006 views
-- `security_invoker = true` on both views: the view runs with the permissions/RLS of the
-- QUERYING user, not the view owner, so the underlying tables' RLS policies still apply.
-- Without it, views default to the owner's (postgres) privileges and would leak all users'
-- data — see https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view.

-- ---------------------------------------------------------------------------
-- v_daily_summary — per user/day: eaten vs target, workout done, set volume.
-- Feeds the Insights tab (PLAN.md §7.8).
-- ---------------------------------------------------------------------------
create view public.v_daily_summary
with (security_invoker = true) as
select
  d.user_id,
  d.date,
  d.base_kcal,
  d.workout_bonus_kcal,
  d.base_kcal + d.workout_bonus_kcal as target_kcal,
  d.protein_g as target_protein_g,
  d.carbs_g as target_carbs_g,
  d.fat_g as target_fat_g,
  d.is_training_day,
  coalesce(f.kcal_eaten, 0) as kcal_eaten,
  coalesce(f.protein_eaten, 0) as protein_eaten,
  coalesce(f.carbs_eaten, 0) as carbs_eaten,
  coalesce(f.fat_eaten, 0) as fat_eaten,
  coalesce(f.log_count, 0) as food_log_count,
  (w.workout_count > 0) as had_workout,
  coalesce(w.workout_count, 0) as workout_count,
  coalesce(w.set_volume_kg, 0) as set_volume_kg,
  coalesce(w.kcal_burned, 0) as kcal_burned
from public.daily_targets d
left join lateral (
  select
    sum(fl.kcal) as kcal_eaten,
    sum(fl.protein_g) as protein_eaten,
    sum(fl.carbs_g) as carbs_eaten,
    sum(fl.fat_g) as fat_eaten,
    count(*) as log_count
  from public.food_logs fl
  where fl.user_id = d.user_id and fl.date = d.date
) f on true
left join lateral (
  select
    count(*) as workout_count,
    sum(w.kcal_burned) as kcal_burned,
    sum(coalesce(ws.volume, 0)) as set_volume_kg
  from public.workouts w
  left join lateral (
    select sum(s.reps * s.weight_kg) as volume
    from public.workout_sets s
    where s.workout_id = w.id
  ) ws on true
  where w.user_id = d.user_id and w.started_at::date = d.date
) w on true;

comment on view public.v_daily_summary is 'Per user/day: eaten kcal & macros vs target, whether a workout happened, and set volume. security_invoker so RLS on the base tables still applies.';

-- ---------------------------------------------------------------------------
-- v_exercise_progress — estimated 1RM per exercise per ISO week (Epley formula:
-- 1RM = weight_kg * (1 + reps / 30)). Uses the best (max) estimate per exercise/week.
-- Only weight_reps-tracked sets with both reps and weight are considered.
-- ---------------------------------------------------------------------------
create view public.v_exercise_progress
with (security_invoker = true) as
select
  w.user_id,
  s.exercise_id,
  date_trunc('week', w.started_at)::date as week_start,
  max(s.weight_kg * (1 + s.reps / 30.0)) as estimated_1rm_kg,
  max(s.weight_kg) as max_weight_kg,
  sum(s.reps * s.weight_kg) as volume_kg,
  count(*) as set_count
from public.workout_sets s
join public.workouts w on w.id = s.workout_id
where s.reps is not null and s.reps > 0 and s.weight_kg is not null and s.weight_kg > 0
group by w.user_id, s.exercise_id, date_trunc('week', w.started_at);

comment on view public.v_exercise_progress is 'Estimated 1RM (Epley) per exercise per week, for the exercise progress chart. security_invoker so RLS applies.';
