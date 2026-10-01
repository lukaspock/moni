-- møni · food_logs.source: add 'label' (nutrition-table scans were stored as 'barcode').
-- Only food_logs has a source column (food_items does not).
alter table public.food_logs drop constraint if exists food_logs_source_check;
alter table public.food_logs
  add constraint food_logs_source_check
  check (source in ('photo', 'text', 'voice', 'barcode', 'label', 'favorite', 'manual'));

-- Existing label scans cannot be told apart from barcode scans retroactively; left as 'barcode'.

-- Daily cleanup of orphaned nutrition-label photos (label-*.jpg in food-images) via the
-- `cleanup-label-photos` Edge Function (Storage objects must be deleted through the Storage API,
-- not by SQL). Same Vault secret pattern as the recompute-targets job.
create or replace function public.trigger_cleanup_label_photos()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service_key text;
  v_url text := 'https://ehjqlatmgvytnzftmkgg.supabase.co/functions/v1/cleanup-label-photos';
begin
  select decrypted_secret into v_service_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if v_service_key is null then
    raise warning 'trigger_cleanup_label_photos: service_role_key not found in Vault, skipping call';
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
end;
$$;

revoke all on function public.trigger_cleanup_label_photos() from public;
revoke all on function public.trigger_cleanup_label_photos() from authenticated;
revoke all on function public.trigger_cleanup_label_photos() from anon;

select cron.schedule(
  'cleanup-label-photos-daily',
  '30 3 * * *',
  $$ select public.trigger_cleanup_label_photos(); $$
);
