-- møni · 002 tables
-- All application tables from PLAN.md §5.
--
-- Conventions:
-- - IDs are `uuid` with `default gen_random_uuid()`, but the CLIENT generates and sends its own
--   UUID on insert (offline-first, idempotent sync). The default only covers server-side/seed
--   inserts. Client upserts use `on conflict (id) do update` in application code.
-- - Enums are modelled as `text` + `check (... in (...))` rather than Postgres `enum` types:
--   enums require `ALTER TYPE ... ADD VALUE` outside transactions and are awkward to evolve
--   across migrations; text+check is trivially extendable in a later migration and maps
--   directly to TypeScript string-literal unions in the generated types. Documented in
--   supabase/README.md.
-- - All monetary/physical values are metric (kg, cm, kcal, grams) per PLAN.md §5.
-- - `user_id` columns reference `auth.users(id) on delete cascade` so account deletion cascades.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- 1:1 with auth.users. Onboarding answers are written AFTER signup, so every
-- onboarding-derived column is nullable; only columns with sane app-wide defaults are NOT NULL.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  sex text check (sex in ('male', 'female')),
  birth_date date,
  height_cm numeric check (height_cm > 0 and height_cm < 300),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active')),
  goal text check (goal in ('lose', 'maintain', 'gain')),
  goal_rate_kg_per_week numeric check (goal_rate_kg_per_week between -2 and 2),
  workouts_per_week smallint check (workouts_per_week between 0 and 14),
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  locale text not null default 'en',
  eat_back_factor numeric not null default 0.7 check (eat_back_factor between 0 and 1.5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Onboarding + settings, one row per auth user. Columns are nullable until onboarding completes.';

-- ---------------------------------------------------------------------------
-- weight_logs
-- ---------------------------------------------------------------------------
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric not null check (weight_kg > 0 and weight_kg < 500),
  source text not null default 'manual' check (source in ('manual', 'healthkit')),
  created_at timestamptz not null default now()
);

create index weight_logs_user_date_idx on public.weight_logs (user_id, date desc);

-- ---------------------------------------------------------------------------
-- daily_targets
-- ---------------------------------------------------------------------------
create table public.daily_targets (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  base_kcal integer not null check (base_kcal >= 0),
  workout_bonus_kcal integer not null default 0 check (workout_bonus_kcal >= 0),
  protein_g numeric not null check (protein_g >= 0),
  carbs_g numeric not null check (carbs_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  tdee_used numeric,
  is_training_day boolean not null default false,
  computed_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- ---------------------------------------------------------------------------
-- tdee_estimates
-- ---------------------------------------------------------------------------
create table public.tdee_estimates (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  formula_tdee numeric,
  observed_tdee numeric,
  blended_tdee numeric,
  confidence numeric check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- ---------------------------------------------------------------------------
-- food_logs / food_items
-- ---------------------------------------------------------------------------
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  source text not null check (source in ('photo', 'text', 'voice', 'barcode', 'favorite', 'manual')),
  title text,
  image_path text,
  kcal numeric not null default 0 check (kcal >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  ai_confidence numeric check (ai_confidence between 0 and 1),
  ai_raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_logs_user_date_idx on public.food_logs (user_id, date desc);

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  food_log_id uuid not null references public.food_logs (id) on delete cascade,
  name text not null,
  grams numeric check (grams >= 0),
  kcal numeric not null default 0 check (kcal >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  barcode text,
  created_at timestamptz not null default now()
);

create index food_items_food_log_idx on public.food_items (food_log_id);

-- ---------------------------------------------------------------------------
-- favorite_meals
-- ---------------------------------------------------------------------------
create table public.favorite_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  items jsonb not null default '[]'::jsonb,
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index favorite_meals_user_idx on public.favorite_meals (user_id);

-- ---------------------------------------------------------------------------
-- exercises (global catalog + user custom exercises)
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade, -- null = global/catalog exercise
  name_key text, -- i18n key, e.g. 'exercise.bench_press' (global exercises)
  custom_name text, -- free-text name (user-created exercises)
  category text not null check (category in ('strength', 'cardio', 'sport', 'other')),
  muscle_groups text[] not null default '{}',
  equipment text,
  met_value numeric check (met_value > 0),
  tracking_type text not null check (tracking_type in ('weight_reps', 'reps', 'duration', 'distance_duration')),
  created_at timestamptz not null default now(),
  constraint exercises_name_present check (name_key is not null or custom_name is not null)
);

create index exercises_owner_idx on public.exercises (owner_id);
create index exercises_category_idx on public.exercises (category);
create unique index exercises_global_name_key_idx on public.exercises (name_key) where owner_id is null;

-- ---------------------------------------------------------------------------
-- routines / routine_exercises / training_plan_days
-- ---------------------------------------------------------------------------
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index routines_user_idx on public.routines (user_id);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  order_index integer not null default 0,
  target_sets smallint check (target_sets >= 0),
  target_reps smallint check (target_reps >= 0)
);

create index routine_exercises_routine_idx on public.routine_exercises (routine_id, order_index);

create table public.training_plan_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  routine_id uuid references public.routines (id) on delete set null, -- null = free training
  expected_kcal integer check (expected_kcal >= 0),
  primary key (user_id, weekday)
);

-- ---------------------------------------------------------------------------
-- workouts / workout_sets
-- ---------------------------------------------------------------------------
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  category text not null check (category in ('strength', 'cardio', 'sport', 'other')),
  kcal_burned numeric check (kcal_burned >= 0),
  kcal_source text check (kcal_source in ('met', 'healthkit', 'manual')),
  healthkit_uuid text unique, -- dedupe against HealthKit imports
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workouts_user_started_idx on public.workouts (user_id, started_at desc);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  set_index smallint not null default 0,
  reps smallint check (reps >= 0),
  weight_kg numeric check (weight_kg >= 0),
  rpe numeric check (rpe between 0 and 10),
  duration_s integer check (duration_s >= 0),
  distance_m numeric check (distance_m >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index workout_sets_workout_idx on public.workout_sets (workout_id, set_index);
create index workout_sets_exercise_idx on public.workout_sets (exercise_id);

-- ---------------------------------------------------------------------------
-- ai_usage / entitlements (server/service-role-owned; client read-only)
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, date)
);

create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_premium boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
