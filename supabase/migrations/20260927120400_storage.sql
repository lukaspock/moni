-- møni · 005 storage
-- Private bucket for food photos. Path convention: `{user_id}/{food_log_id}.jpg`
-- (see PLAN.md §5). Policies check that the first path segment (storage.foldername(name))[1]
-- equals the authenticated user's id, so users can only touch their own folder.

insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', false)
on conflict (id) do nothing;

create policy food_images_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'food-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy food_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'food-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy food_images_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'food-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'food-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy food_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'food-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
