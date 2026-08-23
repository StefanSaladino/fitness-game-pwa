begin;
create extension if not exists pgtap with schema extensions;
select plan(88);

select has_type('public', 'user_report_category', 'report category enum exists');
select has_type('public', 'user_report_reference_type', 'supported evidence-reference enum exists');
select has_type('public', 'moderation_case_status', 'moderation case status enum exists');
select has_table('private', 'user_reports', 'private immutable report evidence exists');
select has_table('private', 'moderation_cases', 'private durable moderation queue exists');
select has_table('private', 'moderation_case_notes', 'private moderator notes exist');
select has_table('private', 'moderation_case_events', 'private append-only case history exists');
select has_column('private', 'user_reports', 'reporter_user_id', 'reports retain reporter identity for authorized review');
select has_column('private', 'user_reports', 'reference_type', 'reports support bounded evidence reference types');
select has_column('private', 'user_reports', 'incident_fingerprint', 'reports store a non-content duplicate fingerprint');
select has_column('private', 'moderation_cases', 'status', 'cases store queue state');
select has_column('private', 'moderation_cases', 'retention_until', 'closed cases store the minimum retention boundary');
select has_column('private', 'moderation_case_notes', 'body', 'case notes store private moderator context');
select has_column('private', 'moderation_case_events', 'action', 'case history stores explicit actions');

select has_function(
  'public',
  'submit_user_report',
  array['uuid','user_report_category','text','user_report_reference_type','uuid','text'],
  'active-account report submission RPC exists'
);
select has_function(
  'public',
  'list_moderation_cases',
  array['moderation_case_status','uuid','integer','integer'],
  'guarded moderation queue RPC exists'
);
select has_function('public', 'get_moderation_case_detail', array['uuid'], 'guarded case detail RPC exists');
select has_function('public', 'list_moderation_case_notes', array['uuid'], 'guarded case-note RPC exists');
select has_function('public', 'list_moderation_case_events', array['uuid'], 'guarded case-history RPC exists');
select has_function('public', 'assign_moderation_case', array['uuid','uuid','text'], 'guarded case assignment RPC exists');
select has_function('public', 'add_moderation_case_note', array['uuid','text'], 'guarded moderator-note RPC exists');
select has_function(
  'public',
  'update_moderation_case_status',
  array['uuid','moderation_case_status','text'],
  'guarded case-status RPC exists'
);

select is(has_schema_privilege('authenticated', 'private', 'usage'), false, 'browser role has no private schema usage');
select is(has_table_privilege('authenticated', 'private.user_reports', 'select'), false, 'browser role cannot read report evidence directly');
select is(has_table_privilege('authenticated', 'private.moderation_cases', 'select'), false, 'browser role cannot read the case queue directly');
select is(has_table_privilege('authenticated', 'private.moderation_case_notes', 'select'), false, 'browser role cannot read moderator notes directly');
select is(has_table_privilege('authenticated', 'private.moderation_case_events', 'select'), false, 'browser role cannot read case history directly');
select is(
  has_function_privilege('authenticated', 'private.append_moderation_case_event(uuid,uuid,text,text,jsonb,jsonb)', 'execute'),
  false,
  'browser role cannot append private history directly'
);
select is(
  has_function_privilege('authenticated', 'public.submit_user_report(uuid,public.user_report_category,text,public.user_report_reference_type,uuid,text)', 'execute'),
  true,
  'authenticated role can reach guarded report submission'
);
select is(
  has_function_privilege('anon', 'public.submit_user_report(uuid,public.user_report_category,text,public.user_report_reference_type,uuid,text)', 'execute'),
  false,
  'anonymous role cannot execute report submission'
);
select is(
  has_function_privilege('authenticated', 'public.list_moderation_cases(public.moderation_case_status,uuid,integer,integer)', 'execute'),
  true,
  'authenticated role can reach the admin-guarded queue RPC'
);
select is(
  has_function_privilege('anon', 'public.list_moderation_cases(public.moderation_case_status,uuid,integer,integer)', 'execute'),
  false,
  'anonymous role cannot execute the queue RPC'
);
select is(has_function_privilege('authenticated', 'public.get_moderation_case_detail(uuid)', 'execute'), true, 'authenticated role can reach guarded case detail');
select is(has_function_privilege('authenticated', 'public.list_moderation_case_notes(uuid)', 'execute'), true, 'authenticated role can reach guarded case notes');
select is(has_function_privilege('authenticated', 'public.list_moderation_case_events(uuid)', 'execute'), true, 'authenticated role can reach guarded case history');
select is(has_function_privilege('authenticated', 'public.assign_moderation_case(uuid,uuid,text)', 'execute'), true, 'authenticated role can reach guarded assignment');
select is(has_function_privilege('authenticated', 'public.add_moderation_case_note(uuid,text)', 'execute'), true, 'authenticated role can reach guarded note creation');
select is(
  has_function_privilege('authenticated', 'public.update_moderation_case_status(uuid,public.moderation_case_status,text)', 'execute'),
  true,
  'authenticated role can reach guarded status mutation'
);
select is(has_type_privilege('authenticated', 'public.user_report_category', 'usage'), true, 'authenticated RPC callers can use the report category type');
select results_eq(
  $$select count(*)::bigint
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_report_reference_type'
      and e.enumlabel = 'MESSAGE'$$,
  array[0::bigint],
  'message evidence is not fabricated before a message source exists'
);
select results_eq(
  $$select bool_and(c.relrowsecurity)::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private'
      and c.relname in ('user_reports','moderation_cases','moderation_case_notes','moderation_case_events')$$,
  array['true'::text],
  'all private moderation tables have RLS enabled as defense in depth'
);
select results_eq(
  $$select count(*)::bigint
    from pg_indexes
    where schemaname = 'private'
      and indexname in ('user_reports_dedupe_idx','moderation_cases_queue_idx','moderation_cases_assignee_idx')$$,
  array[3::bigint],
  'report duplicate and moderator queue lookups are indexed'
);
select results_eq(
  $$select count(*)::bigint
    from pg_trigger
    where tgrelid in (
      'private.user_reports'::regclass,
      'private.moderation_case_notes'::regclass,
      'private.moderation_case_events'::regclass
    )
      and not tgisinternal
      and tgname in ('user_reports_immutable','moderation_case_notes_immutable','moderation_case_events_immutable')$$,
  array[3::bigint],
  'report evidence, notes, and events install immutability triggers'
);

insert into auth.users (id, email, last_sign_in_at) values
  ('153e0100-0000-4000-8000-000000000001', 'admin-153e@test.local', now()),
  ('153e0200-0000-4000-8000-000000000002', 'reporter-153e@test.local', now()),
  ('153e0300-0000-4000-8000-000000000003', 'target-153e@test.local', now()),
  ('153e0400-0000-4000-8000-000000000004', 'other-153e@test.local', now()),
  ('153e0500-0000-4000-8000-000000000005', 'outsider-153e@test.local', now()),
  ('153e0600-0000-4000-8000-000000000006', 'rate-153e@test.local', now());

update public.profiles
set username = case id
  when '153e0100-0000-4000-8000-000000000001'::uuid then 'admin153e'
  when '153e0200-0000-4000-8000-000000000002'::uuid then 'reporter153e'
  when '153e0300-0000-4000-8000-000000000003'::uuid then 'target153e'
  when '153e0400-0000-4000-8000-000000000004'::uuid then 'other153e'
  when '153e0500-0000-4000-8000-000000000005'::uuid then 'outsider153e'
  when '153e0600-0000-4000-8000-000000000006'::uuid then 'rate153e'
end,
display_name = case id
  when '153e0100-0000-4000-8000-000000000001'::uuid then 'Admin 153E'
  when '153e0200-0000-4000-8000-000000000002'::uuid then 'Reporter 153E'
  when '153e0300-0000-4000-8000-000000000003'::uuid then 'Target 153E'
  when '153e0400-0000-4000-8000-000000000004'::uuid then 'Other 153E'
  when '153e0500-0000-4000-8000-000000000005'::uuid then 'Outsider 153E'
  when '153e0600-0000-4000-8000-000000000006'::uuid then 'Rate Reporter 153E'
end
where id in (
  '153e0100-0000-4000-8000-000000000001',
  '153e0200-0000-4000-8000-000000000002',
  '153e0300-0000-4000-8000-000000000003',
  '153e0400-0000-4000-8000-000000000004',
  '153e0500-0000-4000-8000-000000000005',
  '153e0600-0000-4000-8000-000000000006'
);

select lives_ok(
  $$insert into private.platform_admins (user_id, granted_by, grant_reason)
    values ('153e0100-0000-4000-8000-000000000001', null, 'Phase 15.3E transactional moderator')$$,
  'transactional fixture can establish the initial moderator through the existing platform-admin role'
);

insert into public.groups (id, name, created_by)
values (
  '153e0000-0000-4000-8000-000000000099',
  'Phase 15.3E Training Friends',
  '153e0100-0000-4000-8000-000000000001'
);

insert into public.group_members (group_id, user_id, role, status) values
  ('153e0000-0000-4000-8000-000000000099', '153e0200-0000-4000-8000-000000000002', 'MEMBER', 'ACTIVE'),
  ('153e0000-0000-4000-8000-000000000099', '153e0300-0000-4000-8000-000000000003', 'MEMBER', 'ACTIVE'),
  ('153e0000-0000-4000-8000-000000000099', '153e0400-0000-4000-8000-000000000004', 'MEMBER', 'ACTIVE');

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
  scoring_date
) values (
  '153e0000-0000-4000-8000-000000000088',
  '153e0300-0000-4000-8000-000000000003',
  'STRENGTH',
  'COMPLETED',
  'IN_APP',
  now() - interval '1 hour',
  now() - interval '30 minutes',
  1800,
  'UTC',
  current_date
);

insert into public.user_badges (user_id, badge_key)
values ('153e0300-0000-4000-8000-000000000003', 'FIRST_PR');

select set_config(
  'test.phase153e_activity_key',
  public.group_social_activity_key(
    'BADGE',
    '153e0300-0000-4000-8000-000000000003:FIRST_PR'
  ),
  true
);

set local role authenticated;
set local request.jwt.claim.sub = '153e0200-0000-4000-8000-000000000002';

select throws_ok(
  $$select public.submit_user_report(
    '153e0200-0000-4000-8000-000000000002',
    'HARASSMENT',
    'A detailed self report that must be rejected.'
  )$$,
  '42501',
  'Users cannot report themselves',
  'users cannot report themselves'
);
select throws_ok(
  $$select public.submit_user_report(
    '153e0300-0000-4000-8000-000000000003',
    'OTHER',
    'Too short'
  )$$,
  '22023',
  'Report reason must be between 10 and 2000 characters',
  'report submission requires a meaningful reason'
);
select throws_ok(
  $$select public.submit_user_report(
    '153e0700-0000-4000-8000-000000000007',
    'OTHER',
    'This target does not exist in the product.'
  )$$,
  '22023',
  'Target account not found',
  'report submission rejects unknown targets'
);

set local request.jwt.claim.sub = '153e0500-0000-4000-8000-000000000005';
select throws_ok(
  $$select public.submit_user_report(
    '153e0300-0000-4000-8000-000000000003',
    'HARASSMENT',
    'An outsider cannot attach unrelated group evidence.',
    'GROUP',
    '153e0000-0000-4000-8000-000000000099',
    null
  )$$,
  '42501',
  'Evidence reference is not available',
  'unrelated users cannot attach group evidence'
);

set local request.jwt.claim.sub = '153e0200-0000-4000-8000-000000000002';
select lives_ok(
  $$select public.submit_user_report(
    '153e0300-0000-4000-8000-000000000003',
    'HARASSMENT',
    'Repeated unwanted contact in the training group.'
  )$$,
  'active users can submit a report without evidence'
);
select lives_ok(
  $$select public.submit_user_report(
    '153e0300-0000-4000-8000-000000000003',
    'SPAM',
    'Repeated promotional content in the shared group.',
    'GROUP',
    '153e0000-0000-4000-8000-000000000099',
    null
  )$$,
  'shared active group evidence can be attached'
);
select lives_ok(
  $$select public.submit_user_report(
    '153e0300-0000-4000-8000-000000000003',
    'CHEATING',
    'The completed workout needs a moderation review.',
    'WORKOUT',
    '153e0000-0000-4000-8000-000000000099',
    '153e0000-0000-4000-8000-000000000088'
  )$$,
  'completed target workout evidence can be attached within a shared group'
);
select lives_ok(
  $$select public.submit_user_report(
    '153e0300-0000-4000-8000-000000000003',
    'ABUSIVE_CONTENT',
    'The visible group activity needs a moderation review.',
    'SOCIAL_ACTIVITY',
    '153e0000-0000-4000-8000-000000000099',
    current_setting('test.phase153e_activity_key')
  )$$,
  'visible target-owned social activity evidence can be attached'
);
select throws_ok(
  $$select public.submit_user_report(
    '153e0400-0000-4000-8000-000000000004',
    'ABUSIVE_CONTENT',
    'Another member cannot be paired with the target activity.',
    'SOCIAL_ACTIVITY',
    '153e0000-0000-4000-8000-000000000099',
    current_setting('test.phase153e_activity_key')
  )$$,
  '42501',
  'Evidence reference is not available',
  'social evidence must belong to the reported target'
);
select throws_ok(
  $$select public.submit_user_report(
    '153e0300-0000-4000-8000-000000000003',
    'HARASSMENT',
    'Repeated   unwanted contact in the training group.'
  )$$,
  '23505',
  'This incident was already reported recently',
  'normalized duplicate incidents are rejected for 24 hours'
);
select lives_ok(
  $$select public.submit_user_report(
    '153e0300-0000-4000-8000-000000000003',
    'HARASSMENT',
    'A separate later incident with distinct review context.'
  )$$,
  'distinct incidents are not blocked by duplicate protection'
);

reset role;

select results_eq(
  $$select count(*)::bigint
    from private.moderation_cases mc
    join private.user_reports ur on ur.id = mc.report_id
    where ur.reporter_user_id = '153e0200-0000-4000-8000-000000000002'$$,
  array[5::bigint],
  'each accepted submission creates one durable moderation case'
);
select results_eq(
  $$select count(*)::bigint
    from private.moderation_case_events
    where action = 'REPORT_SUBMITTED'$$,
  array[5::bigint],
  'each accepted submission appends its initial case event'
);

select set_config(
  'test.phase153e_case_id',
  (
    select mc.id::text
    from private.moderation_cases mc
    join private.user_reports ur on ur.id = mc.report_id
    where ur.reason = 'Repeated unwanted contact in the training group.'
  ),
  true
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
)
select
  '153e0600-0000-4000-8000-000000000006',
  'rate153e',
  'Rate Reporter 153E',
  '153e0300-0000-4000-8000-000000000003',
  'target153e',
  'Target 153E',
  'OTHER',
  'Rate limit fixture incident ' || fixture_number,
  encode(extensions.digest('phase153e-rate-' || fixture_number, 'sha256'), 'hex')
from generate_series(1, 10) fixture_number;

set local role authenticated;
set local request.jwt.claim.sub = '153e0600-0000-4000-8000-000000000006';
select throws_ok(
  $$select public.submit_user_report(
    '153e0300-0000-4000-8000-000000000003',
    'OTHER',
    'The eleventh rolling-day report is rate limited.'
  )$$,
  '54000',
  'Report submission limit reached; try again later',
  'a reporter is limited to ten submissions in a rolling 24-hour window'
);

set local request.jwt.claim.sub = '153e0200-0000-4000-8000-000000000002';
select throws_ok(
  $$select * from public.list_moderation_cases(null, null, 1, 25)$$,
  '42501',
  'Platform administrator required',
  'reporters cannot read the private moderation queue'
);

set local request.jwt.claim.sub = '153e0300-0000-4000-8000-000000000003';
select throws_ok(
  $$select * from public.get_moderation_case_detail(current_setting('test.phase153e_case_id')::uuid)$$,
  '42501',
  'Platform administrator required',
  'reported users cannot read case detail or reporter identity'
);

set local request.jwt.claim.sub = '153e0100-0000-4000-8000-000000000001';
select results_eq(
  $$select count(*)::bigint from public.list_moderation_cases(null, null, 1, 25)$$,
  array[5::bigint],
  'active platform administrator can read the durable case queue'
);
select results_eq(
  $$select count(*)::bigint
    from public.list_moderation_cases('NEW', null, 1, 25)
    where reporter_user_id = '153e0200-0000-4000-8000-000000000002'
      and target_user_id = '153e0300-0000-4000-8000-000000000003'$$,
  array[5::bigint],
  'authorized moderator receives reporter and target identity snapshots'
);
select results_eq(
  $$select reason
    from public.get_moderation_case_detail(current_setting('test.phase153e_case_id')::uuid)$$,
  array['Repeated unwanted contact in the training group.'::text],
  'authorized moderator can read the full report reason'
);
select results_eq(
  $$select count(*)::bigint
    from public.list_moderation_case_events(current_setting('test.phase153e_case_id')::uuid)$$,
  array[1::bigint],
  'new case begins with exactly one submission event'
);
select throws_ok(
  $$select * from public.list_moderation_cases(null, null, 0, 25)$$,
  '22023',
  'Page must be at least 1',
  'moderation queue rejects page zero'
);
select throws_ok(
  $$select * from public.list_moderation_cases(null, null, 1, 101)$$,
  '22023',
  'Page size must be between 1 and 100',
  'moderation queue rejects oversized pages'
);
select throws_ok(
  $$select public.assign_moderation_case(
    current_setting('test.phase153e_case_id')::uuid,
    '153e0300-0000-4000-8000-000000000003',
    'A normal user cannot be assigned moderation work'
  )$$,
  '42501',
  'Assignee must be an active platform administrator',
  'case assignment accepts only active platform administrators'
);
select lives_ok(
  $$select public.assign_moderation_case(
    current_setting('test.phase153e_case_id')::uuid,
    '153e0100-0000-4000-8000-000000000001',
    'Taking responsibility for the moderation review'
  )$$,
  'active moderator can assign the case'
);

reset role;

select results_eq(
  $$select assigned_to::text
    from private.moderation_cases
    where id = current_setting('test.phase153e_case_id')::uuid$$,
  array['153e0100-0000-4000-8000-000000000001'::text],
  'case assignment persists the active moderator UUID'
);

set local role authenticated;
set local request.jwt.claim.sub = '153e0100-0000-4000-8000-000000000001';
select lives_ok(
  $$select public.add_moderation_case_note(
    current_setting('test.phase153e_case_id')::uuid,
    'Reviewed the reported group context and preserved the relevant identifiers.'
  )$$,
  'active moderator can append a private case note'
);

reset role;

select results_eq(
  $$select body
    from private.moderation_case_notes
    where case_id = current_setting('test.phase153e_case_id')::uuid$$,
  array['Reviewed the reported group context and preserved the relevant identifiers.'::text],
  'moderator note persists only in the private case record'
);

set local role authenticated;
set local request.jwt.claim.sub = '153e0100-0000-4000-8000-000000000001';
select lives_ok(
  $$select public.update_moderation_case_status(
    current_setting('test.phase153e_case_id')::uuid,
    'IN_REVIEW',
    'Evidence review started'
  )$$,
  'NEW case can advance to IN_REVIEW'
);

reset role;

select results_eq(
  $$select status::text
    from private.moderation_cases
    where id = current_setting('test.phase153e_case_id')::uuid$$,
  array['IN_REVIEW'::text],
  'IN_REVIEW state persists in the durable queue'
);
select results_eq(
  $$select (assigned_to = '153e0100-0000-4000-8000-000000000001'::uuid and assigned_at is not null)::text
    from private.moderation_cases
    where id = current_setting('test.phase153e_case_id')::uuid$$,
  array['true'::text],
  'existing assignment remains attached during review'
);

set local role authenticated;
set local request.jwt.claim.sub = '153e0100-0000-4000-8000-000000000001';
select lives_ok(
  $$select public.update_moderation_case_status(
    current_setting('test.phase153e_case_id')::uuid,
    'RESOLVED',
    'Review completed and appropriate action recorded'
  )$$,
  'IN_REVIEW case can advance to RESOLVED'
);

reset role;

select results_eq(
  $$select (closed_at is not null and retention_until >= closed_at + interval '2 years')::text
    from private.moderation_cases
    where id = current_setting('test.phase153e_case_id')::uuid$$,
  array['true'::text],
  'closed cases retain report, evidence, notes, and history for at least two years'
);
select results_eq(
  $$select resolution_reason
    from private.moderation_cases
    where id = current_setting('test.phase153e_case_id')::uuid$$,
  array['Review completed and appropriate action recorded'::text],
  'closed case stores the moderator resolution reason'
);

set local role authenticated;
set local request.jwt.claim.sub = '153e0100-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.add_moderation_case_note(
    current_setting('test.phase153e_case_id')::uuid,
    'A closed case must not accept this note.'
  )$$,
  '22023',
  'Closed moderation cases cannot receive notes',
  'closed cases reject later notes so retention remains well-defined'
);
select throws_ok(
  $$select public.assign_moderation_case(
    current_setting('test.phase153e_case_id')::uuid,
    null,
    'A closed case must not be unassigned'
  )$$,
  '22023',
  'Closed moderation cases cannot be reassigned',
  'closed cases reject assignment mutations'
);
select throws_ok(
  $$select public.update_moderation_case_status(
    current_setting('test.phase153e_case_id')::uuid,
    'DISMISSED',
    'A terminal case cannot transition again'
  )$$,
  '22023',
  'Closed moderation cases cannot transition',
  'RESOLVED and DISMISSED are terminal states'
);

reset role;

select results_eq(
  $$select count(*)::bigint
    from private.moderation_case_events
    where case_id = current_setting('test.phase153e_case_id')::uuid$$,
  array[5::bigint],
  'submission, assignment, note, review, and resolution remain in append-only history'
);
select throws_ok(
  $$update private.moderation_case_events
    set reason = 'tamper'
    where case_id = current_setting('test.phase153e_case_id')::uuid$$,
  '42501',
  'Moderation evidence and history are immutable',
  'case events cannot be edited'
);
select throws_ok(
  $$delete from private.moderation_case_notes
    where case_id = current_setting('test.phase153e_case_id')::uuid$$,
  '42501',
  'Moderation evidence and history are immutable',
  'moderator notes cannot be deleted'
);
select throws_ok(
  $$update private.user_reports
    set reason = 'tampered report evidence'
    where id = (
      select report_id
      from private.moderation_cases
      where id = current_setting('test.phase153e_case_id')::uuid
    )$$,
  '42501',
  'Moderation evidence and history are immutable',
  'submitted report evidence cannot be edited'
);

select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select public.submit_user_report(
    '153e0300-0000-4000-8000-000000000003',
    'OTHER',
    'An unauthenticated submission must be rejected.'
  )$$,
  '42501',
  'Authentication required',
  'unauthenticated callers cannot submit reports'
);
select results_eq(
  $$select count(*)::bigint
    from pg_constraint c
    where c.conrelid = 'private.user_reports'::regclass
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) like '%profiles%'$$,
  array[0::bigint],
  'report identity snapshots survive later profile deletion without profile foreign keys'
);
select results_eq(
  $$select count(*)::bigint
    from private.user_reports
    where reporter_username_snapshot = 'reporter153e'
      and target_username_snapshot = 'target153e'
      and reporter_display_name_snapshot = 'Reporter 153E'
      and target_display_name_snapshot = 'Target 153E'$$,
  array[5::bigint],
  'accepted reports preserve bounded identity snapshots for later authorized review'
);

set local role authenticated;
set local request.jwt.claim.sub = '153e0100-0000-4000-8000-000000000001';
select results_eq(
  $$select count(*)::bigint
    from public.list_moderation_cases('RESOLVED', null, 1, 25)$$,
  array[1::bigint],
  'moderation queue status filter returns the closed case'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);

select * from finish();
rollback;
