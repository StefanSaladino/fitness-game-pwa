begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

select has_column('public', 'profiles', 'preferred_weight_unit', 'profiles persist a preferred display/input weight unit');
select is(
  (select column_default = '''KG''::text' from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='preferred_weight_unit'),
  true,
  'preferred weight unit defaults to canonical kilograms'
);
select has_function(
  'public',
  'update_my_profile_settings',
  array['text','text','text','smallint','text'],
  'authoritative self-profile update RPC exists'
);
select is(
  has_function_privilege('authenticated','public.update_my_profile_settings(text,text,text,smallint,text)','execute'),
  true,
  'authenticated users can execute the self-profile RPC'
);
select is(
  has_function_privilege('anon','public.update_my_profile_settings(text,text,text,smallint,text)','execute'),
  false,
  'anonymous callers cannot execute the self-profile RPC'
);
select is(
  has_function_privilege('public','public.update_my_profile_settings(text,text,text,smallint,text)','execute'),
  false,
  'PUBLIC receives no implicit self-profile RPC access'
);
select is(has_column_privilege('authenticated','public.profiles','username','update'),false,'username cannot be updated directly');
select is(has_column_privilege('authenticated','public.profiles','display_name','update'),false,'display name cannot be updated directly');
select is(has_column_privilege('authenticated','public.profiles','timezone','update'),false,'timezone cannot be updated directly');
select is(has_column_privilege('authenticated','public.profiles','preferred_weight_unit','update'),false,'weight-unit preference cannot be updated directly');
select is(has_column_privilege('authenticated','public.profiles','profile_picture_path','update'),true,'dedicated profile-picture updates remain available');

insert into auth.users (id,email,last_sign_in_at) values
  ('15600100-0000-4000-8000-000000000001','settings-owner-156@test.local',now()),
  ('15600200-0000-4000-8000-000000000002','settings-other-156@test.local',now()),
  ('15600300-0000-4000-8000-000000000003','settings-suspended-156@test.local',now());

update public.profiles
set username = case id
      when '15600100-0000-4000-8000-000000000001'::uuid then 'settings_owner'
      when '15600200-0000-4000-8000-000000000002'::uuid then 'settings_other'
      else 'settings_suspended'
    end,
    display_name = 'Settings fixture',
    timezone = 'America/Toronto',
    weekly_workout_target = 3,
    onboarding_completed_at = now()
where id in (
  '15600100-0000-4000-8000-000000000001',
  '15600200-0000-4000-8000-000000000002',
  '15600300-0000-4000-8000-000000000003'
);

insert into public.weekly_goals(user_id,week_start,target)
values ('15600100-0000-4000-8000-000000000001','2026-08-17',3);

set local role authenticated;
set local request.jwt.claim.sub = '15600100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.update_my_profile_settings('  New_Name  ','  New display  ','America/Vancouver',5::smallint,'lb')$$,
  'active user can update validated profile settings atomically'
);
select is(
  (select username='new_name' and display_name='New display' and timezone='America/Vancouver' and preferred_weight_unit='LB'
    from public.profiles where id='15600100-0000-4000-8000-000000000001'),
  true,
  'identity and display preferences are normalized and persisted'
);
select is(
  (select weekly_workout_target=3 and pending_weekly_workout_target=5
    from public.profiles where id='15600100-0000-4000-8000-000000000001'),
  true,
  'weekly target changes are scheduled without rewriting the active target'
);
select is(
  (select (
      extract(isodow from pending_weekly_workout_target_week_start)=1
      and pending_weekly_workout_target_week_start > (now() at time zone timezone)::date
    )
    from public.profiles where id='15600100-0000-4000-8000-000000000001'),
  true,
  'scheduled weekly targets begin on a future Monday in the updated timezone'
);
select results_eq(
  $$select count(*) from public.weekly_goals where user_id='15600100-0000-4000-8000-000000000001' and week_start='2026-08-17' and target=3$$,
  array[1::bigint],
  'profile settings never rewrite historical weekly goals'
);
reset role;
select is(
  (select username='settings_other' and preferred_weight_unit='KG' from public.profiles where id='15600200-0000-4000-8000-000000000002'),
  true,
  'self-profile RPC cannot alter another user'
);
set local role authenticated;
set local request.jwt.claim.sub = '15600100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.update_my_profile_settings('new_name','New display','America/Vancouver',3::smallint,'KG')$$,
  'choosing the active weekly target can cancel a scheduled change'
);
select is(
  (select pending_weekly_workout_target is null and pending_weekly_workout_target_week_start is null
    from public.profiles where id='15600100-0000-4000-8000-000000000001'),
  true,
  'cancelled target schedule clears both pending fields'
);

select throws_ok(
  $$select public.update_my_profile_settings('bad-name','Valid','America/Toronto',3::smallint,'KG')$$,
  '22023','Username must be 3-32 lowercase letters, numbers, or underscores','invalid usernames fail closed'
);
select throws_ok(
  $$select public.update_my_profile_settings('settings_other','Valid','America/Toronto',3::smallint,'KG')$$,
  '23505','Username already taken','duplicate usernames fail closed'
);
select throws_ok(
  $$select public.update_my_profile_settings('new_name','','America/Toronto',3::smallint,'KG')$$,
  '22023','Invalid display name','invalid display names fail closed'
);
select throws_ok(
  $$select public.update_my_profile_settings('new_name','Valid','Mars/Olympus',3::smallint,'KG')$$,
  '22023','Invalid timezone','invalid timezones fail closed'
);
select throws_ok(
  $$select public.update_my_profile_settings('new_name','Valid','America/Toronto',0::smallint,'KG')$$,
  '22023','Weekly target must be 1-7','invalid weekly targets fail closed'
);
select throws_ok(
  $$select public.update_my_profile_settings('new_name','Valid','America/Toronto',3::smallint,'STONE')$$,
  '22023','Preferred weight unit must be KG or LB','unsupported weight units fail closed'
);
select throws_ok(
  $$select public.update_my_profile_settings('new_name','Valid','America/Toronto',3::smallint,null)$$,
  '22023','Preferred weight unit must be KG or LB','missing weight units fail closed'
);
select results_eq(
  $$select count(*) from public.scoring_events where user_id='15600100-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'profile preferences do not create or alter scoring events'
);

reset role;
update private.platform_account_state
set status='SUSPENDED',status_reason='Phase 15.6A suspension fixture'
where user_id='15600300-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claim.sub = '15600300-0000-4000-8000-000000000003';
select throws_ok(
  $$select public.update_my_profile_settings('settings_suspended','Suspended','America/Toronto',3::smallint,'KG')$$,
  '42501','Account is not active','suspended users cannot update profile settings'
);

reset role;
select is(
  (select prosecdef from pg_proc where oid='public.update_my_profile_settings(text,text,text,smallint,text)'::regprocedure),
  true,
  'profile update RPC is a security-definer boundary'
);
select is(
  (select proconfig = array['search_path=""'] from pg_proc where oid='public.update_my_profile_settings(text,text,text,smallint,text)'::regprocedure),
  true,
  'profile update RPC pins an empty search path'
);
select results_eq(
  $$select count(*) from public.weekly_goals where user_id='15600100-0000-4000-8000-000000000001'$$,
  array[1::bigint],
  'all settings updates leave authoritative weekly-goal history unchanged'
);

select * from finish();
rollback;
