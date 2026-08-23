begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

select has_type('public', 'moderation_activity_type', 'bounded moderation activity enum exists');
select has_table('private', 'moderation_access_log', 'private sensitive-access audit exists');
select has_column('private', 'moderation_access_log', 'access_kind', 'access audit distinguishes case and activity review');
select has_column('private', 'moderation_access_log', 'reason', 'activity review records its declared purpose');
select has_column('private', 'moderation_access_log', 'activity_types', 'activity review records its bounded source selection');
select has_column('private', 'moderation_access_log', 'expires_at', 'activity grants have an explicit expiry');
select has_column('private', 'moderation_access_log', 'retention_until', 'access audit has an explicit retention boundary');
select has_function(
  'public',
  'begin_moderation_activity_review',
  array['uuid','text','uuid','moderation_activity_type[]'],
  'audited activity-review grant RPC exists'
);
select has_function(
  'public',
  'list_moderation_activity_review',
  array['uuid','timestamp with time zone','text','integer'],
  'cursor-paginated activity-review RPC exists'
);
select has_function('private', 'resolve_moderation_subject', array['uuid'], 'private deletion-safe subject resolver exists');
select has_function(
  'private',
  'append_moderation_access',
  array['uuid','uuid','uuid','text','text','moderation_activity_type[]','timestamp with time zone'],
  'private access-audit append boundary exists'
);
select is(has_schema_privilege('authenticated', 'private', 'usage'), false, 'browser role has no private schema usage');
select is(has_table_privilege('authenticated', 'private.moderation_access_log', 'select'), false, 'browser role cannot read access audit directly');
select is(
  has_function_privilege(
    'authenticated',
    'private.append_moderation_access(uuid,uuid,uuid,text,text,public.moderation_activity_type[],timestamp with time zone)',
    'execute'
  ),
  false,
  'browser role cannot fabricate access audit'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.begin_moderation_activity_review(uuid,text,uuid,public.moderation_activity_type[])',
    'execute'
  ),
  true,
  'authenticated role can reach the admin-guarded activity grant'
);
select is(
  has_function_privilege(
    'anon',
    'public.begin_moderation_activity_review(uuid,text,uuid,public.moderation_activity_type[])',
    'execute'
  ),
  false,
  'anonymous role cannot begin activity review'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.list_moderation_activity_review(uuid,timestamp with time zone,text,integer)',
    'execute'
  ),
  true,
  'authenticated role can reach the admin-guarded timeline'
);
select is(
  has_function_privilege(
    'anon',
    'public.list_moderation_activity_review(uuid,timestamp with time zone,text,integer)',
    'execute'
  ),
  false,
  'anonymous role cannot list activity review'
);
select is(has_type_privilege('authenticated', 'public.moderation_activity_type', 'usage'), true, 'authenticated RPC callers can use the bounded activity enum');
select results_eq(
  $$select count(*)::bigint
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'moderation_activity_type'
      and e.enumlabel = 'COMMUNICATION'$$,
  array[0::bigint],
  'communication activity is not fabricated before Phase 15.4 creates a durable source'
);
select results_eq(
  $$select c.relrowsecurity::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private' and c.relname = 'moderation_access_log'$$,
  array['true'::text],
  'private access audit has RLS enabled as defense in depth'
);
select results_eq(
  $$select count(*)::bigint
    from pg_indexes
    where indexname in (
      'moderation_access_actor_granted_idx',
      'moderation_access_target_granted_idx',
      'moderation_access_case_granted_idx',
      'platform_admin_audit_target_review_idx',
      'group_members_user_review_idx',
      'group_activity_reactions_user_review_idx'
    )$$,
  array[6::bigint],
  'access audit and target-scoped activity sources are indexed'
);
select results_eq(
  $$select count(*)::bigint
    from pg_trigger
    where tgrelid = 'private.moderation_access_log'::regclass
      and not tgisinternal
      and tgname = 'moderation_access_log_immutable'$$,
  array[1::bigint],
  'access audit installs an immutability trigger'
);
select results_eq(
  $$select p.provolatile::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_moderation_case_detail'
      and pg_get_function_identity_arguments(p.oid) = 'p_case_id uuid'$$,
  array['v'::text],
  'case detail is volatile because sensitive access is now audited'
);

insert into auth.users (id, email, last_sign_in_at) values
  ('153f0100-0000-4000-8000-000000000001', 'admin-153f@test.local', now()),
  ('153f0200-0000-4000-8000-000000000002', 'reporter-153f@test.local', now()),
  ('153f0300-0000-4000-8000-000000000003', 'target-153f@test.local', now()),
  ('153f0400-0000-4000-8000-000000000004', 'other-admin-153f@test.local', now()),
  ('153f0500-0000-4000-8000-000000000005', 'other-target-153f@test.local', now());

update public.profiles
set username = case id
  when '153f0100-0000-4000-8000-000000000001'::uuid then 'admin153f'
  when '153f0200-0000-4000-8000-000000000002'::uuid then 'reporter153f'
  when '153f0300-0000-4000-8000-000000000003'::uuid then 'target153f'
  when '153f0400-0000-4000-8000-000000000004'::uuid then 'adminb153f'
  when '153f0500-0000-4000-8000-000000000005'::uuid then 'othertarget153f'
end,
display_name = case id
  when '153f0100-0000-4000-8000-000000000001'::uuid then 'Admin 153F'
  when '153f0200-0000-4000-8000-000000000002'::uuid then 'Reporter 153F'
  when '153f0300-0000-4000-8000-000000000003'::uuid then 'Target 153F'
  when '153f0400-0000-4000-8000-000000000004'::uuid then 'Second Admin 153F'
  when '153f0500-0000-4000-8000-000000000005'::uuid then 'Other Target 153F'
end
where id in (
  '153f0100-0000-4000-8000-000000000001',
  '153f0200-0000-4000-8000-000000000002',
  '153f0300-0000-4000-8000-000000000003',
  '153f0400-0000-4000-8000-000000000004',
  '153f0500-0000-4000-8000-000000000005'
);

insert into private.platform_admins (user_id, granted_by, grant_reason) values
  ('153f0100-0000-4000-8000-000000000001', null, 'Phase 15.3F primary moderator'),
  ('153f0400-0000-4000-8000-000000000004', '153f0100-0000-4000-8000-000000000001', 'Phase 15.3F second moderator');

insert into public.groups (id, name, created_by)
values (
  '153f0000-0000-4000-8000-000000000099',
  'Phase 15.3F Review Group',
  '153f0100-0000-4000-8000-000000000001'
);

insert into public.group_members (group_id, user_id, role, status, joined_at) values
  ('153f0000-0000-4000-8000-000000000099', '153f0200-0000-4000-8000-000000000002', 'MEMBER', 'ACTIVE', now() - interval '5 days'),
  ('153f0000-0000-4000-8000-000000000099', '153f0300-0000-4000-8000-000000000003', 'MEMBER', 'ACTIVE', now() - interval '4 days');

insert into public.workout_sessions (
  id,
  user_id,
  category,
  status,
  source,
  started_at,
  ended_at,
  active_duration_seconds,
  timezone_at_start,
  scoring_date,
  qualifies_lifting,
  notes
) values (
  '153f0000-0000-4000-8000-000000000088',
  '153f0300-0000-4000-8000-000000000003',
  'STRENGTH',
  'COMPLETED',
  'IN_APP',
  now() - interval '3 days',
  now() - interval '3 days' + interval '30 minutes',
  1800,
  'UTC',
  current_date - 3,
  true,
  'PRIVATE_WORKOUT_NOTE_MUST_NEVER_LEAVE_SOURCE_TABLE'
);

insert into public.group_activity_reactions (
  group_id, activity_key, user_id, reaction_type, created_at, updated_at
) values (
  '153f0000-0000-4000-8000-000000000099',
  'LIFT:153f-private-opaque-activity',
  '153f0300-0000-4000-8000-000000000003',
  'FIRE',
  now() - interval '2 days',
  now() - interval '2 days'
);

insert into private.platform_admin_audit_log (
  actor_user_id, target_user_id, action, reason, before_state, after_state, occurred_at
) values (
  '153f0100-0000-4000-8000-000000000001',
  '153f0300-0000-4000-8000-000000000003',
  'ACCOUNT_SUSPENDED',
  'Safety review fixture',
  jsonb_build_object('account_status', 'ACTIVE'),
  jsonb_build_object('account_status', 'SUSPENDED'),
  now() - interval '1 day'
);

set local role authenticated;
set local request.jwt.claim.sub = '153f0200-0000-4000-8000-000000000002';

select set_config(
  'test.phase153f_case_id',
  public.submit_user_report(
    '153f0300-0000-4000-8000-000000000003',
    'HARASSMENT',
    'Repeated unwanted contact needs a privacy-bounded review.',
    'GROUP',
    '153f0000-0000-4000-8000-000000000099',
    null
  )::text,
  true
);

select throws_ok(
  $$select * from public.begin_moderation_activity_review(
    '153f0300-0000-4000-8000-000000000003',
    'Trying to inspect another user'
  )$$,
  '42501',
  'Platform administrator required',
  'ordinary users cannot begin sensitive activity review'
);

set local request.jwt.claim.sub = '153f0100-0000-4000-8000-000000000001';

select throws_ok(
  $$select * from public.begin_moderation_activity_review(
    '153f0300-0000-4000-8000-000000000003',
    'x'
  )$$,
  '22023',
  'Activity access reason must be between 3 and 500 characters',
  'activity review requires a meaningful declared purpose'
);
select throws_ok(
  $$select * from public.begin_moderation_activity_review(
    '153f0300-0000-4000-8000-000000000003',
    'Reviewing the reported incident',
    null,
    array[]::public.moderation_activity_type[]
  )$$,
  '22023',
  'Choose between 1 and 5 supported activity types',
  'activity review rejects an empty source selection'
);
reset role;
insert into private.user_reports (
  id, reporter_user_id, reporter_username_snapshot, reporter_display_name_snapshot,
  target_user_id, target_username_snapshot, target_display_name_snapshot,
  category, reason, incident_fingerprint
) values (
  '153f0000-0000-4000-8000-000000000077',
  '153f0200-0000-4000-8000-000000000002', 'reporter153f', 'Reporter 153F',
  '153f0500-0000-4000-8000-000000000005', 'othertarget153f', 'Other Target 153F',
  'OTHER', 'Separate case for case-to-subject authorization testing.',
  encode(extensions.digest('phase153f-other-case', 'sha256'), 'hex')
);
insert into private.moderation_cases (id, report_id)
values ('153f0000-0000-4000-8000-000000000076', '153f0000-0000-4000-8000-000000000077');

set local role authenticated;
set local request.jwt.claim.sub = '153f0100-0000-4000-8000-000000000001';
select throws_ok(
  $$select * from public.begin_moderation_activity_review(
    '153f0300-0000-4000-8000-000000000003',
    'Reviewing a mismatched case',
    '153f0000-0000-4000-8000-000000000076'
  )$$,
  '42501',
  'Moderation case does not concern this subject',
  'an actual mismatched case is rejected'
);

select set_config(
  'test.phase153f_access_id',
  (
    select access_id::text
    from public.begin_moderation_activity_review(
      '153f0300-0000-4000-8000-000000000003',
      'Investigating the reported group-safety context',
      current_setting('test.phase153f_case_id')::uuid
    )
  ),
  true
);

select results_eq(
  $$select target_username || '|' || target_display_name || '|' || account_status::text
    from public.begin_moderation_activity_review(
      '153f0300-0000-4000-8000-000000000003',
      'Confirming the review subject identity',
      current_setting('test.phase153f_case_id')::uuid,
      array['WORKOUT'::public.moderation_activity_type]
    )$$,
  array['target153f|Target 153F|ACTIVE'::text],
  'review grant returns only minimum subject identity and current account state'
);
select results_eq(
  $$select count(*)::bigint
    from public.list_moderation_activity_review(
      current_setting('test.phase153f_access_id')::uuid,
      null,
      null,
      25
    )$$,
  array[5::bigint],
  'authorized timeline combines account, workout, membership, group activity, and report sources'
);
select results_eq(
  $$select string_agg(activity_type::text, ',' order by activity_type::text)
    from public.list_moderation_activity_review(
      current_setting('test.phase153f_access_id')::uuid,
      null,
      null,
      25
    )$$,
  array['ACCOUNT,GROUP_ACTIVITY,GROUP_MEMBERSHIP,REPORT,WORKOUT'::text],
  'timeline exposes only the declared purpose-built activity types'
);
select results_eq(
  $$select count(*)::bigint
    from public.list_moderation_activity_review(
      current_setting('test.phase153f_access_id')::uuid,
      null,
      null,
      25
    )
    where metadata::text like '%PRIVATE_WORKOUT_NOTE_MUST_NEVER_LEAVE_SOURCE_TABLE%'$$,
  array[0::bigint],
  'workout notes are redacted from moderation review'
);
select results_eq(
  $$select count(*)::bigint
    from public.list_moderation_activity_review(
      current_setting('test.phase153f_access_id')::uuid,
      null,
      null,
      25
    )
    where source_case_id = current_setting('test.phase153f_case_id')::uuid
      and activity_type = 'REPORT'$$,
  array[1::bigint],
  'report activity links back to its originating moderation case'
);
select results_eq(
  $$select count(*)::bigint
    from public.list_moderation_activity_review(
      (
        select access_id
        from public.begin_moderation_activity_review(
          '153f0300-0000-4000-8000-000000000003',
          'Reviewing workouts only',
          current_setting('test.phase153f_case_id')::uuid,
          array['WORKOUT'::public.moderation_activity_type]
        )
      ),
      null,
      null,
      25
    )
    where activity_type <> 'WORKOUT'$$,
  array[0::bigint],
  'activity source selection is enforced server-side'
);
select results_eq(
  $$select count(*)::bigint
    from public.list_moderation_activity_review(
      current_setting('test.phase153f_access_id')::uuid,
      null,
      null,
      2
    )
    where has_more$$,
  array[2::bigint],
  'bounded first page reports that more activity is available'
);
select throws_ok(
  $$select * from public.list_moderation_activity_review(
    current_setting('test.phase153f_access_id')::uuid,
    now(),
    null,
    25
  )$$,
  '22023',
  'Activity cursor timestamp and key must be provided together',
  'activity cursor is atomic'
);
select throws_ok(
  $$select * from public.list_moderation_activity_review(
    current_setting('test.phase153f_access_id')::uuid,
    null,
    null,
    51
  )$$,
  '22023',
  'Activity page size must be between 1 and 50',
  'activity review rejects oversized pages'
);

set local request.jwt.claim.sub = '153f0400-0000-4000-8000-000000000004';
select throws_ok(
  $$select * from public.list_moderation_activity_review(
    current_setting('test.phase153f_access_id')::uuid,
    null,
    null,
    25
  )$$,
  '42501',
  'Active moderation activity access is required',
  'review grants are bound to the moderator who declared the purpose'
);

reset role;
insert into private.moderation_access_log (
  id,
  actor_user_id,
  actor_username_snapshot,
  actor_display_name_snapshot,
  target_user_id,
  target_username_snapshot,
  target_display_name_snapshot,
  access_kind,
  reason,
  activity_types,
  granted_at,
  expires_at,
  retention_until
) values (
  '153f0000-0000-4000-8000-000000000066',
  '153f0100-0000-4000-8000-000000000001',
  'admin153f',
  'Admin 153F',
  '153f0300-0000-4000-8000-000000000003',
  'target153f',
  'Target 153F',
  'ACTIVITY_TIMELINE',
  'Expired review fixture',
  array['WORKOUT'::public.moderation_activity_type],
  now() - interval '1 hour',
  now() - interval '45 minutes',
  now() + interval '2 years'
);

set local role authenticated;
set local request.jwt.claim.sub = '153f0100-0000-4000-8000-000000000001';
select throws_ok(
  $$select * from public.list_moderation_activity_review(
    '153f0000-0000-4000-8000-000000000066', null, null, 25
  )$$,
  '42501',
  'Active moderation activity access is required',
  'expired review grants cannot be reused'
);
select lives_ok(
  $$select * from public.get_moderation_case_detail(current_setting('test.phase153f_case_id')::uuid)$$,
  'authorized case detail remains available through the audited boundary'
);

reset role;
select results_eq(
  $$select count(*)::bigint
    from private.moderation_access_log
    where access_kind = 'CASE_DETAIL'
      and case_id = current_setting('test.phase153f_case_id')::uuid$$,
  array[1::bigint],
  'opening full case detail creates one sensitive-access audit record'
);
select results_eq(
  $$select reason
    from private.moderation_access_log
    where id = current_setting('test.phase153f_access_id')::uuid$$,
  array['Investigating the reported group-safety context'::text],
  'activity access audit preserves the moderator declared purpose'
);
select results_eq(
  $$select (expires_at <= granted_at + interval '15 minutes')::text
      || '|' || (retention_until >= granted_at + interval '2 years')::text
    from private.moderation_access_log
    where id = current_setting('test.phase153f_access_id')::uuid$$,
  array['true|true'::text],
  'review grant expiry and access-audit retention are bounded'
);
select throws_ok(
  $$update private.moderation_access_log
    set reason = 'Attempted rewrite'
    where id = current_setting('test.phase153f_access_id')::uuid$$,
  '42501',
  'Moderation evidence and history are immutable',
  'sensitive access audit is append-only'
);

insert into private.user_reports (
  reporter_user_id,
  reporter_username_snapshot,
  reporter_display_name_snapshot,
  target_user_id,
  target_username_snapshot,
  target_display_name_snapshot,
  category,
  reason,
  incident_fingerprint
) values (
  '153f0200-0000-4000-8000-000000000002',
  'reporter153f',
  'Reporter 153F',
  '153f0900-0000-4000-8000-000000000009',
  'deleted153f',
  'Deleted Subject 153F',
  'OTHER',
  'Retained evidence for a deleted moderation subject.',
  encode(extensions.digest('phase153f-deleted-subject', 'sha256'), 'hex')
);

set local role authenticated;
set local request.jwt.claim.sub = '153f0100-0000-4000-8000-000000000001';
select results_eq(
  $$select target_username || '|' || target_display_name || '|' || coalesce(account_status::text, 'DELETED')
    from public.begin_moderation_activity_review(
      '153f0900-0000-4000-8000-000000000009',
      'Reviewing retained evidence after deletion'
    )$$,
  array['deleted153f|Deleted Subject 153F|DELETED'::text],
  'identity snapshots preserve deletion-safe retained review context'
);

select * from finish();
rollback;
