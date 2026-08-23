begin;
create extension if not exists pgtap with schema extensions;
select plan(79);

select has_table('private','push_runtime_config','push runtime config exists');
select has_table('private','push_subscriptions','private push subscriptions exist');
select has_table('private','push_delivery_queue','durable push queue exists');
select has_table('private','push_delivery_targets','per-device push delivery targets exist');
select has_column('private','push_subscriptions','endpoint','subscription endpoint is stored privately');
select has_column('private','push_subscriptions','p256dh','subscription p256dh key is stored privately');
select has_column('private','push_subscriptions','auth_secret','subscription auth key is stored privately');
select has_column('private','push_delivery_queue','target_subscription_id','test delivery can target one device');
select has_column('private','push_delivery_queue','dedupe_key','push queue has durable dedupe identity');
select has_column('private','push_delivery_targets','status','delivery targets retain per-device status');
select is((select relrowsecurity from pg_class where oid='private.push_subscriptions'::regclass),true,'push subscriptions enforce RLS');
select is((select relrowsecurity from pg_class where oid='private.push_delivery_queue'::regclass),true,'push queue enforces RLS');
select is((select relrowsecurity from pg_class where oid='private.push_delivery_targets'::regclass),true,'push targets enforce RLS');
select is(has_table_privilege('authenticated','private.push_subscriptions','select'),false,'authenticated browser role has no direct subscription-table read');
select is(has_table_privilege('authenticated','private.push_delivery_queue','select'),false,'authenticated browser role has no direct delivery-queue read');
select is(has_table_privilege('anon','private.push_subscriptions','select'),false,'anonymous role has no direct subscription-table read');

select has_function('public','register_my_push_subscription',array['text','text','text','text'],'self-service device registration RPC exists');
select has_function('public','revoke_my_push_subscription',array['text'],'self-service device revocation RPC exists');
select has_function('public','get_my_push_device_summary',array[]::text[],'self-service device summary RPC exists');
select has_function('public','enqueue_my_push_test',array['text'],'explicit self-test push RPC exists');
select has_function('public','get_push_delivery_runtime',array[]::text[],'service-only runtime RPC exists');
select has_function('public','initialize_push_vapid_keys',array['text','text'],'service-only VAPID initialization RPC exists');
select has_function('public','prepare_push_delivery',array['uuid'],'service-only delivery preparation RPC exists');
select has_function('public','record_push_delivery_result',array['uuid','uuid','text','text'],'service-only delivery completion RPC exists');
select is(has_function_privilege('authenticated','public.register_my_push_subscription(text,text,text,text)','execute'),true,'authenticated users can register their own device');
select is(has_function_privilege('authenticated','public.revoke_my_push_subscription(text)','execute'),true,'authenticated users can revoke their own device');
select is(has_function_privilege('authenticated','public.get_my_push_device_summary()','execute'),true,'authenticated users can read only their device count');
select is(has_function_privilege('authenticated','public.enqueue_my_push_test(text)','execute'),true,'authenticated users can explicitly test their own registered device');
select is(has_function_privilege('anon','public.register_my_push_subscription(text,text,text,text)','execute'),false,'anonymous callers cannot register push devices');
select is(has_function_privilege('authenticated','public.get_push_delivery_runtime()','execute'),false,'browser users cannot read push runtime secrets');
select is(has_function_privilege('authenticated','public.prepare_push_delivery(uuid)','execute'),false,'browser users cannot prepare server delivery');
select is(has_function_privilege('service_role','public.get_push_delivery_runtime()','execute'),true,'service role can read server-only push runtime');
select is(has_function_privilege('service_role','public.prepare_push_delivery(uuid)','execute'),true,'service role can prepare push delivery');
select is(has_function_privilege('service_role','public.record_push_delivery_result(uuid,uuid,text,text)','execute'),true,'service role can record push results');

select has_trigger('private','push_delivery_queue','push_delivery_queue_dispatch','queue insertion has async Edge dispatch trigger');
select has_trigger('public','user_badges','user_badges_enqueue_push','badge award has optional push enqueue trigger');
select has_trigger('public','scoring_events','scoring_events_enqueue_personal_record_push','personal-record scoring has optional push enqueue trigger');
select has_trigger('public','group_invites','group_invites_enqueue_push','group invitation has optional push enqueue trigger');
select results_eq(
  $$select count(*) from cron.job where jobname='fitness-push-delivery'$$,
  array[1::bigint],
  'one hosted retry cron job exists for pending push delivery'
);

insert into auth.users (id,email,last_sign_in_at) values
  ('156c0100-0000-4000-8000-000000000001','push-owner@test.local',now()),
  ('156c0200-0000-4000-8000-000000000002','push-other@test.local',now()),
  ('156c0300-0000-4000-8000-000000000003','push-suspended@test.local',now()),
  ('156c0400-0000-4000-8000-000000000004','push-inviter@test.local',now());

update public.profiles
set username = case id
      when '156c0100-0000-4000-8000-000000000001'::uuid then 'push_owner'
      when '156c0200-0000-4000-8000-000000000002'::uuid then 'push_other'
      when '156c0300-0000-4000-8000-000000000003'::uuid then 'push_suspended'
      else 'push_inviter'
    end,
    display_name = case id
      when '156c0400-0000-4000-8000-000000000004'::uuid then 'Push Inviter'
      else 'Push Fixture'
    end,
    timezone='America/Toronto',
    weekly_workout_target=3,
    onboarding_completed_at=now()
where id in (
  '156c0100-0000-4000-8000-000000000001',
  '156c0200-0000-4000-8000-000000000002',
  '156c0300-0000-4000-8000-000000000003',
  '156c0400-0000-4000-8000-000000000004'
);

update private.platform_account_state
set status='SUSPENDED', status_reason='Phase 15.6C suspension fixture'
where user_id='156c0300-0000-4000-8000-000000000003';

update public.notification_preferences
set notifications_enabled=true,
    badge_achievements=true,
    personal_record_alerts=true,
    group_invitations=true
where user_id='156c0100-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claim.sub = '156c0100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.register_my_push_subscription(
    'https://push.example.test/device-owner-aaaaaaaaaaaaaaaa',
    'BElongPushPublicKeyFixture012345678901234567890123456789',
    'authsecretfixtureowner',
    'Phase 15.6C test browser'
  )$$,
  'active user can register their own push device'
);
select results_eq(
  $$select active_device_count from public.get_my_push_device_summary()$$,
  array[1],
  'device summary counts only the current account active devices'
);

reset role;
select results_eq(
  $$select count(*) from private.push_subscriptions where user_id='156c0100-0000-4000-8000-000000000001' and revoked_at is null$$,
  array[1::bigint],
  'registration creates one active private subscription row'
);

set local role authenticated;
set local request.jwt.claim.sub = '156c0100-0000-4000-8000-000000000001';
select lives_ok(
  $$select public.register_my_push_subscription(
    'https://push.example.test/device-owner-bbbbbbbbbbbbbbbb',
    'BElongPushPublicKeyFixtureBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'authsecretfixtureowner2',
    'Second Phase 15.6C browser'
  )$$,
  'same account can register a second device'
);
select results_eq(
  $$select active_device_count from public.get_my_push_device_summary()$$,
  array[2],
  'multiple authorized devices are retained independently'
);
select lives_ok(
  $$select public.enqueue_my_push_test('https://push.example.test/device-owner-aaaaaaaaaaaaaaaa')$$,
  'user can queue an explicit test for a registered current device'
);

reset role;
select results_eq(
  $$select count(*) from private.push_delivery_queue where user_id='156c0100-0000-4000-8000-000000000001' and category='TEST' and target_subscription_id is not null$$,
  array[1::bigint],
  'test push targets exactly one registered device instead of all devices'
);

set local role authenticated;
set local request.jwt.claim.sub = '156c0200-0000-4000-8000-000000000002';
select lives_ok(
  $$select public.register_my_push_subscription(
    'https://push.example.test/shared-device-cccccccccccccccc',
    'BElongPushPublicKeyFixtureCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'authsecretfixtureshared',
    'Shared browser'
  )$$,
  'second account can register a shared-browser endpoint'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '156c0100-0000-4000-8000-000000000001';
select lives_ok(
  $$select public.register_my_push_subscription(
    'https://push.example.test/shared-device-cccccccccccccccc',
    'BElongPushPublicKeyFixtureDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
    'authsecretfixtureshared2',
    'Shared browser after account switch'
  )$$,
  'current account can reclaim the endpoint it possesses after an account switch'
);
reset role;
select results_eq(
  $$select count(*) from private.push_subscriptions where endpoint='https://push.example.test/shared-device-cccccccccccccccc' and user_id='156c0100-0000-4000-8000-000000000001' and revoked_at is null$$,
  array[1::bigint],
  'shared-browser endpoint ownership moves to the current authenticated account'
);
select results_eq(
  $$select count(*) from private.push_subscriptions where endpoint='https://push.example.test/shared-device-cccccccccccccccc' and user_id='156c0200-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'shared-browser endpoint is no longer associated with the prior account'
);

set local role authenticated;
set local request.jwt.claim.sub = '156c0100-0000-4000-8000-000000000001';
select is(
  public.revoke_my_push_subscription('https://push.example.test/shared-device-cccccccccccccccc'),
  true,
  'current account can revoke only its own device endpoint'
);
select results_eq(
  $$select active_device_count from public.get_my_push_device_summary()$$,
  array[2],
  'revoking one of three current devices leaves the other two active'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '156c0300-0000-4000-8000-000000000003';
select throws_ok(
  $$select public.register_my_push_subscription(
    'https://push.example.test/suspended-dddddddddddddddd',
    'BElongPushPublicKeyFixtureEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
    'authsecretfixturesuspended',
    'Suspended browser'
  )$$,
  '42501',
  'Account is not active',
  'suspended users cannot register push subscriptions'
);
select throws_ok(
  $$select * from public.get_my_push_device_summary()$$,
  '42501',
  'Account is not active',
  'suspended users cannot inspect push device state'
);
reset role;

insert into public.user_badges (user_id,badge_key,earned_at)
values ('156c0200-0000-4000-8000-000000000002','FIRST_PR',now());
select results_eq(
  $$select count(*) from private.push_delivery_queue where user_id='156c0200-0000-4000-8000-000000000002' and category='BADGE_ACHIEVEMENTS'$$,
  array[0::bigint],
  'default-off accounts do not enqueue optional badge push'
);

insert into public.user_badges (user_id,badge_key,earned_at)
values ('156c0100-0000-4000-8000-000000000001','FIRST_PR',now());
select results_eq(
  $$select count(*) from private.push_delivery_queue where user_id='156c0100-0000-4000-8000-000000000001' and category='BADGE_ACHIEVEMENTS'$$,
  array[1::bigint],
  'enabled badge preference enqueues one durable badge push'
);

insert into public.scoring_events (
  id,user_id,scoring_date,event_type,exercise_id,amount,scoring_version,metadata
)
select
  '156c1000-0000-4000-8000-000000000010'::uuid,
  '156c0100-0000-4000-8000-000000000001'::uuid,
  current_date,
  'EXERCISE_PROGRESS'::public.scoring_event_type,
  ec.id,
  5,
  'lifting-v1',
  '{}'::jsonb
from public.exercise_catalog ec
where ec.active
order by ec.canonical_name
limit 1;
select results_eq(
  $$select count(*) from private.push_delivery_queue where dedupe_key='personal-record:156c1000-0000-4000-8000-000000000010'$$,
  array[1::bigint],
  'authoritative exercise-progression event enqueues one personal-record push'
);

insert into public.scoring_events (
  id,user_id,scoring_date,event_type,amount,scoring_version,metadata
) values (
  '156c1100-0000-4000-8000-000000000011',
  '156c0100-0000-4000-8000-000000000001',
  current_date,
  'LIFTING_WORKOUT',
  50,
  'lifting-v1',
  '{}'::jsonb
);
select results_eq(
  $$select count(*) from private.push_delivery_queue where dedupe_key='personal-record:156c1100-0000-4000-8000-000000000011'$$,
  array[0::bigint],
  'non-progression scoring events do not masquerade as personal-record pushes'
);

insert into public.groups (id,name,created_by)
values ('156c2000-0000-4000-8000-000000000020','Push Test Group','156c0400-0000-4000-8000-000000000004');
insert into public.group_invites (id,group_id,created_by,invited_user_id)
values (
  '156c2100-0000-4000-8000-000000000021',
  '156c2000-0000-4000-8000-000000000020',
  '156c0400-0000-4000-8000-000000000004',
  '156c0100-0000-4000-8000-000000000001'
);
select results_eq(
  $$select count(*) from private.push_delivery_queue where dedupe_key='group-invite:156c2100-0000-4000-8000-000000000021'$$,
  array[1::bigint],
  'group invitation enqueues one privacy-bounded invitation push'
);

select results_eq(
  $$select count(*) from private.push_delivery_queue where category in ('BADGE_ACHIEVEMENTS','PERSONAL_RECORD_ALERTS','GROUP_INVITATIONS') and body ~* 'notes|password|token'$$,
  array[0::bigint],
  'automated push payloads do not include workout notes or credential language'
);

update public.notification_preferences
set notifications_enabled=false
where user_id='156c0100-0000-4000-8000-000000000001';

select results_eq(
  $$select count(*) from public.prepare_push_delivery((select id from private.push_delivery_queue where category='BADGE_ACHIEVEMENTS' and user_id='156c0100-0000-4000-8000-000000000001' order by created_at limit 1))$$,
  array[0::bigint],
  'delivery preparation suppresses queued optional push after master preference turns off'
);
select results_eq(
  $$select status from private.push_delivery_queue where category='BADGE_ACHIEVEMENTS' and user_id='156c0100-0000-4000-8000-000000000001' order by created_at limit 1$$,
  array['SUPPRESSED'::text],
  'master-off suppression is persisted without deleting category selections'
);

update public.notification_preferences
set notifications_enabled=true
where user_id='156c0100-0000-4000-8000-000000000001';

select results_eq(
  $$select count(*) from public.prepare_push_delivery('156c1000-0000-4000-8000-000000000010'::uuid)$$,
  array[0::bigint],
  'queue ids are distinct from source event ids'
);

select results_eq(
  $$select count(*) from public.prepare_push_delivery((select id from private.push_delivery_queue where dedupe_key='personal-record:156c1000-0000-4000-8000-000000000010'))$$,
  array[2::bigint],
  'one optional event prepares one delivery target per active account device'
);
select results_eq(
  $$select count(*) from private.push_delivery_targets t join private.push_delivery_queue q on q.id=t.queue_id where q.dedupe_key='personal-record:156c1000-0000-4000-8000-000000000010'$$,
  array[2::bigint],
  'multi-device delivery targets are stored independently'
);

select public.record_push_delivery_result(
  (select id from private.push_delivery_queue where dedupe_key='personal-record:156c1000-0000-4000-8000-000000000010'),
  (select t.subscription_id from private.push_delivery_targets t join private.push_delivery_queue q on q.id=t.queue_id where q.dedupe_key='personal-record:156c1000-0000-4000-8000-000000000010' order by t.subscription_id limit 1),
  'SENT',
  null
);
select results_eq(
  $$select count(*) from private.push_delivery_targets t join private.push_delivery_queue q on q.id=t.queue_id where q.dedupe_key='personal-record:156c1000-0000-4000-8000-000000000010' and t.status='SENT'$$,
  array[1::bigint],
  'successful device delivery is tracked independently'
);
select results_eq(
  $$select status from private.push_delivery_queue where dedupe_key='personal-record:156c1000-0000-4000-8000-000000000010'$$,
  array['PENDING'::text],
  'queue remains pending while another device still requires delivery'
);

select public.record_push_delivery_result(
  (select id from private.push_delivery_queue where dedupe_key='personal-record:156c1000-0000-4000-8000-000000000010'),
  (select t.subscription_id from private.push_delivery_targets t join private.push_delivery_queue q on q.id=t.queue_id where q.dedupe_key='personal-record:156c1000-0000-4000-8000-000000000010' and t.status='PENDING' limit 1),
  'SENT',
  null
);
select results_eq(
  $$select status from private.push_delivery_queue where dedupe_key='personal-record:156c1000-0000-4000-8000-000000000010'$$,
  array['SENT'::text],
  'queue becomes sent after all pending device targets become terminal with a success'
);
select results_eq(
  $$select (delivered_at is not null) from private.push_delivery_queue where dedupe_key='personal-record:156c1000-0000-4000-8000-000000000010'$$,
  array[true],
  'successful queue records a delivered timestamp'
);

select private.enqueue_optional_push(
  '156c0100-0000-4000-8000-000000000001',
  'TEST',
  'Expired test',
  'Expired test',
  '/settings',
  'expired-test:156c',
  (select id from private.push_subscriptions where endpoint='https://push.example.test/device-owner-aaaaaaaaaaaaaaaa')
);
select results_eq(
  $$select count(*) from public.prepare_push_delivery((select id from private.push_delivery_queue where dedupe_key='expired-test:156c'))$$,
  array[1::bigint],
  'targeted test prepares exactly its selected active device'
);
select public.record_push_delivery_result(
  (select id from private.push_delivery_queue where dedupe_key='expired-test:156c'),
  (select id from private.push_subscriptions where endpoint='https://push.example.test/device-owner-aaaaaaaaaaaaaaaa'),
  'EXPIRED',
  'PUSH_ENDPOINT_GONE'
);
select results_eq(
  $$select count(*) from private.push_subscriptions where endpoint='https://push.example.test/device-owner-aaaaaaaaaaaaaaaa' and revoked_at is not null$$,
  array[1::bigint],
  'provider-expired endpoint is revoked for future deliveries'
);

select private.enqueue_optional_push(
  '156c0100-0000-4000-8000-000000000001',
  'TEST',
  'Retry test',
  'Retry test',
  '/settings',
  'retry-test:156c',
  (select id from private.push_subscriptions where endpoint='https://push.example.test/device-owner-bbbbbbbbbbbbbbbb')
);
select public.prepare_push_delivery((select id from private.push_delivery_queue where dedupe_key='retry-test:156c'));
select public.record_push_delivery_result(
  (select id from private.push_delivery_queue where dedupe_key='retry-test:156c'),
  (select id from private.push_subscriptions where endpoint='https://push.example.test/device-owner-bbbbbbbbbbbbbbbb'),
  'RETRY',
  'PUSH_PROVIDER_TEMPORARY'
);
select results_eq(
  $$select status from private.push_delivery_queue where dedupe_key='retry-test:156c'$$,
  array['PENDING'::text],
  'transient provider failure keeps queue retryable'
);
select results_eq(
  $$select count(*) from private.push_delivery_targets t join private.push_delivery_queue q on q.id=t.queue_id where q.dedupe_key='retry-test:156c' and t.status='PENDING' and t.attempt_count=1$$,
  array[1::bigint],
  'transient failure retains the device target with an incremented attempt count'
);
select results_eq(
  $$select (available_at > now()) from private.push_delivery_queue where dedupe_key='retry-test:156c'$$,
  array[true],
  'transient failure schedules a later retry rather than an immediate busy loop'
);

select is((select prosecdef from pg_proc where oid='public.register_my_push_subscription(text,text,text,text)'::regprocedure),true,'registration RPC is a security-definer boundary');
select is((select proconfig = array['search_path=""'] from pg_proc where oid='public.register_my_push_subscription(text,text,text,text)'::regprocedure),true,'registration RPC pins an empty search path');
select is((select prosecdef from pg_proc where oid='public.prepare_push_delivery(uuid)'::regprocedure),true,'server delivery preparation is a security-definer boundary');
select is((select proconfig = array['search_path=""'] from pg_proc where oid='public.prepare_push_delivery(uuid)'::regprocedure),true,'server delivery preparation pins an empty search path');
select results_eq(
  $$select count(*) from public.notification_preferences where user_id='156c0100-0000-4000-8000-000000000001' and badge_achievements and personal_record_alerts and group_invitations$$,
  array[1::bigint],
  'delivery suppression never clears persisted category selections'
);

select * from finish();
rollback;
