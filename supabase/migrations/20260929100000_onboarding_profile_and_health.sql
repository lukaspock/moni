-- Extended onboarding (personalization) + Apple Health dedupe for weights.
-- All new profile columns are nullable: existing users simply haven't answered yet.

alter table public.profiles
  add column display_name text check (char_length(display_name) between 1 and 40),
  add column motivation text check (motivation in ('health', 'look', 'performance', 'energy', 'confidence')),
  add column diet text check (diet in ('omnivore', 'flexitarian', 'pescetarian', 'vegetarian', 'vegan')),
  add column training_experience text check (training_experience in ('beginner', 'intermediate', 'advanced')),
  add column target_weight_kg numeric check (target_weight_kg > 0 and target_weight_kg < 500),
  add column health_disclaimer_accepted_at timestamptz;

comment on column public.profiles.display_name is 'First name for personal greetings (optional).';
comment on column public.profiles.motivation is 'Primary "why" from onboarding, used to personalize copy.';
comment on column public.profiles.target_weight_kg is 'Optional goal weight; drives the projected goal date.';
comment on column public.profiles.health_disclaimer_accepted_at is '"No medical advice" acknowledgement from onboarding (GDPR/App Review).';

-- HealthKit weight samples: dedupe on the sample UUID (same pattern as workouts.healthkit_uuid).
alter table public.weight_logs
  add column healthkit_uuid text unique;
