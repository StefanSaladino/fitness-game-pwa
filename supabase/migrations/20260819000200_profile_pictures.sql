-- Phase 5.5C: profile pictures only (no avatar/customization system).

alter table public.profiles
  add column if not exists profile_picture_path text;

alter table public.profiles
  drop constraint if exists profiles_profile_picture_path_owned;

alter table public.profiles
  add constraint profiles_profile_picture_path_owned
  check (
    profile_picture_path is null
    or (
      char_length(profile_picture_path) between 38 and 220
      and profile_picture_path like id::text || '/%'
    )
  );

grant update (profile_picture_path) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-pictures',
  'profile-pictures',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket means profile pictures can be served without a signed URL.
-- Mutation is still restricted to the authenticated user's UUID folder.
drop policy if exists profile_pictures_select_own on storage.objects;
create policy profile_pictures_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists profile_pictures_insert_own on storage.objects;
create policy profile_pictures_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists profile_pictures_delete_own on storage.objects;
create policy profile_pictures_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
