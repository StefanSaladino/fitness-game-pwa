begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_column('public', 'profiles', 'profile_picture_path', 'profiles store a profile-picture path reference');
select results_eq(
  $$select public from storage.buckets where id = 'profile-pictures'$$,
  array[true],
  'profile-pictures bucket is public for social display'
);
select results_eq(
  $$select file_size_limit from storage.buckets where id = 'profile-pictures'$$,
  array[2097152::bigint],
  'profile-picture bucket caps stored objects at 2 MiB'
);
select results_eq(
  $$select allowed_mime_types @> array['image/jpeg','image/png','image/webp']::text[] from storage.buckets where id = 'profile-pictures'$$,
  array[true],
  'profile-picture bucket allows the supported image MIME types'
);
select is(
  has_column_privilege('authenticated', 'public.profiles', 'profile_picture_path', 'UPDATE'),
  true,
  'authenticated users have column-level update privilege for profile_picture_path'
);
select results_eq(
  $$select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile_pictures_select_own'$$,
  array[1::bigint],
  'own-folder storage select policy exists'
);
select results_eq(
  $$select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile_pictures_insert_own'$$,
  array[1::bigint],
  'own-folder storage insert policy exists'
);
select results_eq(
  $$select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile_pictures_delete_own'$$,
  array[1::bigint],
  'own-folder storage delete policy exists'
);

insert into auth.users (id, email) values
  ('91111111-1111-4111-8111-111111111111', 'pfp-owner@test.local'),
  ('92222222-2222-4222-8222-222222222222', 'pfp-other@test.local');

set local role authenticated;
select set_config('request.jwt.claim.sub', '91111111-1111-4111-8111-111111111111', true);

select lives_ok(
  $$update public.profiles set profile_picture_path='91111111-1111-4111-8111-111111111111/photo.webp' where id='91111111-1111-4111-8111-111111111111'$$,
  'user can store a path inside their own UUID folder'
);
select throws_ok(
  $$update public.profiles set profile_picture_path='92222222-2222-4222-8222-222222222222/photo.webp' where id='91111111-1111-4111-8111-111111111111'$$,
  '23514',
  null,
  'profile row rejects another users storage folder'
);
select lives_ok(
  $$update public.profiles set profile_picture_path=null where id='91111111-1111-4111-8111-111111111111'$$,
  'user can clear their own profile picture path'
);
select results_eq(
  $$select count(*) from public.profiles where id='92222222-2222-4222-8222-222222222222' and profile_picture_path is not null$$,
  array[0::bigint],
  'user cannot alter another profile picture through their own update path'
);

reset role;
select * from finish();
rollback;
