-- ---------------------------------------------------------------------------
-- routine_exercises: supersets/circuits + rep range lower bound.
-- superset_group: exercises of one routine that share a group number and sit
--   next to each other (order_index) are trained alternately (A1 -> B1 -> rest).
--   null = a normal, standalone exercise. Numbers are per routine (1..20).
-- target_reps_min: lower end of the rep range ("3 x 8-10"); target_reps keeps
--   the upper end. null = no range (single target). Previously only device-local.
-- RLS: the existing routine_exercises policies (ownership via routines) cover
-- the new columns; no policy changes needed.
-- ---------------------------------------------------------------------------
alter table public.routine_exercises
  add column superset_group smallint check (superset_group between 1 and 20),
  add column target_reps_min smallint check (target_reps_min >= 0);
