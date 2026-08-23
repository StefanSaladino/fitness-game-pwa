begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

select has_table('public','notification_preferences','notification preferences table exists');
select has_column('public','notification_preferences','user_id','notification preferences are user-owned');
select has_column('public','notification_preferences','notifications_enabled','master notification preference exists');
select has_column('public','notification_preferences','workout_reminders','workout reminder preference exists');
select has_column('public','notification_preferences','weekly_goal_reminders','weekly-goal reminder preference exists');
select has_column('public','notification_preferences','badge_achievements','badge/achievement preference exists');
select has_column('public','notification_preferences','personal_record_alerts','personal-record preference exists');
select has_column('public','notification_preferences','group_activity','group-activity preference exists');
select has_column('public','notification_preferences','group_invitations','group-invitation preference exists');
select is((select relrowsecurity from pg_class where oid='public.notification_preferences'::regclass),true,'notification preferences enforce RLS');
select is(has_table_privilege('authenticated','public.notification_preferences','select'),true,'authenticated callers can read the RLS-scoped preference row');
select is(has_table_privilege('authenticated','public.notification_preferences','insert'),false,'authenticated callers cannot insert preference rows directly');
select is(has_table_privilege('authenticated','public.notification_preferences','update'),false,'authenticated callers cannot update preference rows directly');
select is(has_table_privilege('authenticated','public.notification_preferences','delete'),false,'authenticated callers cannot delete preference rows directly');
select is(has_table_privilege('anon','public.notification_preferences','select'),false,'anonymous callers cannot read notification preferences');
select has_function('public','update_my_notification_preferences',array['boolean','boolean','boolean','boolean','boolean','boolean','boolean'],'self-only notification preference RPC exists');
select is(has_function_privilege('authenticated','public.update_my_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean)','execute'),true,'authenticated users can execute the self-only notification preference RPC');
select is(has_function_privilege('anon','public.update_my_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean)','execute'),false,'anonymous callers cannot execute notification preference updates');
select is(has_function_privilege('public','public.update_my_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean)','execute'),false,'PUBLIC receives no implicit notification preference RPC access');
select has_trigger('public','profiles','profiles_create_notification_preferences','new profiles automatically receive notification preferences');

insert into auth.users (id,email,last_sign_in_at) values
  ('15610100-0000-4000-8000-000000000001','notifications-owner-156@test.local',now()),
  ('15610200-0000-4000-8000-000000000002','notifications-other-156@test.local',now()),
  ('15610300-0000-4000-8000-000000000003','notifications-suspended-156@test.local',now());

update public.profiles
set username = case id
      when '15610100-0000-4000-8000-000000000001'::uuid then 'notify_owner'
      when '15610200-0000-4000-8000-000000000002'::uuid then 'notify_other'
      else 'notify_suspended'
    end,
    display_name = 'Notification fixture',
    timezone = 'America/Toronto',
    weekly_workout_target = 3,
    onboarding_completed_at = now()
where id in (
  '15610100-0000-4000-8000-000000000001',
  '15610200-0000-4000-8000-000000000002',
  '15610300-0000-4000-8000-000000000003'
);

select results_eq(
  $$select count(*) from public.notification_preferences where user_id in (
    '15610100-0000-4000-8000-000000000001'::uuid,
    '15610200-0000-4000-8000-000000000002'::uuid,
    '15610300-0000-4000-8000-000000000003'::uuid
  )$$,
  array[3::bigint],
  'profile insert trigger initializes every fixture preference row'
);
select results_eq(
  $$select count(*) from public.notification_preferences
    where user_id='15610100-0000-4000-8000-000000000001'
      and notifications_enabled=false
      and workout_reminders=false
      and weekly_goal_reminders=false
      and badge_achievements=false
      and personal_record_alerts=false
      and group_activity=false
      and group_invitations=false$$,
  array[1::bigint],
  'all optional notification preferences default off'
);

set local role authenticated;
set local request.jwt.claim.sub = '15610100-0000-4000-8000-000000000001';

select results_eq(
  $$select count(*) from public.notification_preferences$$,
  array[1::bigint],
  'RLS exposes only the current user notification preference row'
);
select results_eq(
  $$select count(*) from public.notification_preferences where user_id='15610200-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'RLS hides another user notification preference row'
);
select lives_ok(
  $$select public.update_my_notification_preferences(true,true,false,true,true,false,true)$$,
  'active user can update only their own notification preferences'
);
select is(
  (select notifications_enabled
      and workout_reminders
      and not weekly_goal_reminders
      and badge_achievements
      and personal_record_alerts
      and not group_activity
      and group_invitations
    from public.notification_preferences
    where user_id='15610100-0000-4000-8000-000000000001'),
  true,
  'master and individual category selections persist independently'
);
select lives_ok(
  $$select public.update_my_notification_preferences(false,true,false,true,true,false,true)$$,
  'master notifications can be disabled without clearing category selections'
);
select is(
  (select not notifications_enabled
      and workout_reminders
      and not weekly_goal_reminders
      and badge_achievements
      and personal_record_alerts
      and not group_activity
      and group_invitations
    from public.notification_preferences
    where user_id='15610100-0000-4000-8000-000000000001'),
  true,
  'master OFF preserves individual category selections'
);
select lives_ok(
  $$select public.update_my_notification_preferences(true,true,false,true,true,false,true)$$,
  'master notifications can be re-enabled with prior selections intact'
);
select is(
  (select notifications_enabled
      and workout_reminders
      and not weekly_goal_reminders
      and badge_achievements
      and personal_record_alerts
      and not group_activity
      and group_invitations
    from public.notification_preferences
    where user_id='15610100-0000-4000-8000-000000000001'),
  true,
  'master ON restores the previously preserved category selections'
);
select throws_ok(
  $$select public.update_my_notification_preferences(null,true,false,true,true,false,true)$$,
  '22004','Notification preferences cannot be null','missing notification values fail closed'
);

reset role;
select results_eq(
  $$select count(*) from public.notification_preferences
    where user_id='15610200-0000-4000-8000-000000000002'
      and notifications_enabled=false
      and workout_reminders=false
      and weekly_goal_reminders=false
      and badge_achievements=false
      and personal_record_alerts=false
      and group_activity=false
      and group_invitations=false$$,
  array[1::bigint],
  'self-service updates cannot alter another user preference row'
);

update private.platform_account_state
set status='SUSPENDED',status_reason='Phase 15.6B suspension fixture'
where user_id='15610300-0000-4000-8000-000000000003';

set local role authenticated;
set local request.jwt.claim.sub = '15610300-0000-4000-8000-000000000003';
select throws_ok(
  $$select public.update_my_notification_preferences(true,true,true,true,true,true,true)$$,
  '42501','Account is not active','suspended users cannot update notification preferences'
);

reset role;
select is(
  (select prosecdef from pg_proc where oid='public.update_my_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean)'::regprocedure),
  true,
  'notification preference update RPC is a security-definer boundary'
);
select is(
  (select proconfig = array['search_path=""'] from pg_proc where oid='public.update_my_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean)'::regprocedure),
  true,
  'notification preference update RPC pins an empty search path'
);
select results_eq(
  $$select count(*) from public.scoring_events where user_id='15610100-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'notification preference updates do not create scoring events'
);
select results_eq(
  $$select count(*) from public.user_badges where user_id='15610100-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'notification preference updates do not award badges'
);

select * from finish();
rollback;
