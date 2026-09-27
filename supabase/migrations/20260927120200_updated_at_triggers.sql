-- møni · 003 updated_at triggers
-- Generic trigger to keep `updated_at` current on every UPDATE. Useful for sync (client can
-- compare updated_at for conflict resolution / last-write-wins on the outbox).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is 'Sets NEW.updated_at = now() on UPDATE. Attached to tables with an updated_at column.';

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.food_logs
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.favorite_meals
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.routines
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.workouts
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.workout_sets
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.entitlements
  for each row execute function public.set_updated_at();
