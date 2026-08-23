begin;
create extension if not exists pgtap with schema extensions;
select plan(96);

select has_type('public', 'platform_message_type', 'platform message type enum exists');
select has_type('public', 'platform_message_audience_type', 'platform message audience enum exists');
select has_type('public', 'platform_message_status', 'platform message status enum exists');
select results_eq(
  $$select count(*)::bigint
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname='public' and t.typname='moderation_activity_type' and e.enumlabel='COMMUNICATION'$$,
  array[1::bigint],
  'durable communication activity is now a supported moderation source'
);

select has_table('private', 'platform_messages', 'private durable message metadata exists');
select has_table('private', 'platform_message_revisions', 'private immutable content revisions exist');
select has_table('private', 'platform_message_deliveries', 'private per-recipient delivery history exists');
select has_table('private', 'platform_message_events', 'private administrator message audit exists');
select has_table('private', 'platform_message_previews', 'private short-lived audience previews exist');
select has_column('private', 'platform_message_revisions', 'subject', 'message revisions preserve the recipient-visible subject');
select has_column('private', 'platform_message_deliveries', 'read_revision', 'delivery read state is revision-aware');
select has_column('private', 'platform_message_deliveries', 'acknowledged_revision', 'delivery acknowledgement is revision-aware');
select has_column('private', 'platform_message_events', 'action', 'message audit stores the explicit action');
select has_column('private', 'platform_message_previews', 'recipient_fingerprint', 'audience preview binds a non-enumerating fingerprint');

select has_function('public', 'search_platform_message_users', array['text','integer'], 'admin user audience search exists');
select has_function('public', 'search_platform_message_groups', array['text','integer'], 'admin group audience search exists');
select has_function(
  'public', 'preview_platform_message_audience',
  array['platform_message_audience_type','uuid','uuid','platform_message_type'],
  'server-side audience preview exists'
);
select has_function(
  'public', 'send_platform_message',
  array['uuid','text','text','boolean','timestamp with time zone','text','text'],
  'set-based idempotent message send exists'
);
select has_function('public', 'edit_platform_message', array['uuid','text','text','timestamp with time zone','text'], 'audited message revision RPC exists');
select has_function('public', 'withdraw_platform_message', array['uuid','text'], 'audited message withdrawal RPC exists');
select has_function('public', 'list_platform_messages', array['integer','integer'], 'admin delivery overview exists');
select has_function('public', 'list_my_platform_messages', array['integer','integer','boolean'], 'user inbox RPC exists');
select has_function('public', 'mark_platform_message_read', array['uuid'], 'user read-state RPC exists');
select has_function('public', 'acknowledge_platform_message', array['uuid'], 'user acknowledgement RPC exists');
select has_function(
  'private', 'resolve_platform_message_recipients',
  array['platform_message_audience_type','uuid','uuid','platform_message_type'],
  'private recipient resolver exists'
);
select has_function(
  'private', 'platform_message_recipient_fingerprint',
  array['platform_message_audience_type','uuid','uuid','platform_message_type'],
  'private audience fingerprint boundary exists'
);

select is(has_schema_privilege('authenticated', 'private', 'usage'), false, 'browser role has no private schema usage');
select is(has_table_privilege('authenticated', 'private.platform_messages', 'select'), false, 'browser role cannot read message metadata directly');
select is(has_table_privilege('authenticated', 'private.platform_message_revisions', 'select'), false, 'browser role cannot read content revisions directly');
select is(has_table_privilege('authenticated', 'private.platform_message_deliveries', 'select'), false, 'browser role cannot enumerate deliveries directly');
select is(has_table_privilege('authenticated', 'private.platform_message_events', 'select'), false, 'browser role cannot read message audit directly');
select is(has_table_privilege('authenticated', 'private.platform_message_previews', 'select'), false, 'browser role cannot read audience fingerprints directly');
select is(
  has_function_privilege('authenticated', 'public.preview_platform_message_audience(public.platform_message_audience_type,uuid,uuid,public.platform_message_type)', 'execute'),
  true,
  'authenticated callers can reach the admin-guarded audience preview'
);
select is(
  has_function_privilege('anon', 'public.preview_platform_message_audience(public.platform_message_audience_type,uuid,uuid,public.platform_message_type)', 'execute'),
  false,
  'anonymous callers cannot preview privileged audiences'
);
select is(
  has_function_privilege('authenticated', 'public.send_platform_message(uuid,text,text,boolean,timestamp with time zone,text,text)', 'execute'),
  true,
  'authenticated callers can reach the admin-guarded send boundary'
);
select is(
  has_function_privilege('anon', 'public.send_platform_message(uuid,text,text,boolean,timestamp with time zone,text,text)', 'execute'),
  false,
  'anonymous callers cannot send messages'
);
select is(
  has_function_privilege('authenticated', 'public.list_my_platform_messages(integer,integer,boolean)', 'execute'),
  true,
  'authenticated active accounts can reach their guarded inbox'
);
select is(
  has_function_privilege('anon', 'public.list_my_platform_messages(integer,integer,boolean)', 'execute'),
  false,
  'anonymous callers cannot read an inbox'
);
select is(has_type_privilege('authenticated', 'public.platform_message_type', 'usage'), true, 'authenticated RPC callers can use the message type');
select results_eq(
  $$select bool_and(c.relrowsecurity)::text
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='private' and c.relname in (
      'platform_messages','platform_message_revisions','platform_message_deliveries',
      'platform_message_events','platform_message_previews'
    )$$,
  array['true'::text],
  'all private messaging tables have RLS enabled as defense in depth'
);
select results_eq(
  $$select count(*)::bigint from pg_indexes
    where schemaname='private' and indexname in (
      'platform_messages_creator_sent_idx','platform_messages_audience_sent_idx',
      'platform_message_deliveries_recipient_idx','platform_message_events_message_idx',
      'platform_message_previews_actor_expiry_idx'
    )$$,
  array[5::bigint],
  'message fan-out, inbox, audit, and preview lookups are indexed'
);
select results_eq(
  $$select count(*)::bigint from pg_trigger
    where not tgisinternal and tgname in (
      'platform_messages_no_delete','platform_message_revisions_immutable',
      'platform_message_deliveries_protected','platform_message_events_immutable'
    )$$,
  array[4::bigint],
  'message history and delivery identity install retention guards'
);
select results_eq(
  $$select bool_and(p.prosecdef and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%')::text
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'search_platform_message_users','search_platform_message_groups',
      'preview_platform_message_audience','send_platform_message','edit_platform_message',
      'withdraw_platform_message','list_platform_messages','list_my_platform_messages',
      'mark_platform_message_read','acknowledge_platform_message'
    )$$,
  array['true'::text],
  'every exposed messaging RPC is security-definer with a pinned empty search path'
);

select set_config(
  'test.phase154_active_before',
  (select count(*)::text
   from private.platform_account_state
   where status = 'ACTIVE'::public.platform_account_status),
  true
);

insert into auth.users (id, email, last_sign_in_at) values
  ('15400100-0000-4000-8000-000000000001', 'admin-154@test.local', now()),
  ('15400200-0000-4000-8000-000000000002', 'member-one-154@test.local', now()),
  ('15400300-0000-4000-8000-000000000003', 'member-two-154@test.local', now()),
  ('15400400-0000-4000-8000-000000000004', 'suspended-154@test.local', now()),
  ('15400500-0000-4000-8000-000000000005', 'deletion-154@test.local', now());

update public.profiles
set username = case id
  when '15400100-0000-4000-8000-000000000001'::uuid then 'admin154'
  when '15400200-0000-4000-8000-000000000002'::uuid then 'memberone154'
  when '15400300-0000-4000-8000-000000000003'::uuid then 'membertwo154'
  when '15400400-0000-4000-8000-000000000004'::uuid then 'suspended154'
  when '15400500-0000-4000-8000-000000000005'::uuid then 'deletion154'
end,
display_name = case id
  when '15400100-0000-4000-8000-000000000001'::uuid then 'Admin 154'
  when '15400200-0000-4000-8000-000000000002'::uuid then 'Member One 154'
  when '15400300-0000-4000-8000-000000000003'::uuid then 'Member Two 154'
  when '15400400-0000-4000-8000-000000000004'::uuid then 'Suspended 154'
  when '15400500-0000-4000-8000-000000000005'::uuid then 'Deletion 154'
end
where id in (
  '15400100-0000-4000-8000-000000000001','15400200-0000-4000-8000-000000000002',
  '15400300-0000-4000-8000-000000000003','15400400-0000-4000-8000-000000000004',
  '15400500-0000-4000-8000-000000000005'
);

insert into private.platform_admins (user_id, granted_by, grant_reason)
values ('15400100-0000-4000-8000-000000000001', null, 'Phase 15.4 transactional administrator');

update private.platform_account_state
set status='SUSPENDED', status_reason='Phase 15.4 suspended recipient fixture'
where user_id='15400400-0000-4000-8000-000000000004';

update private.platform_account_state
set
  status='DELETION_PENDING',
  status_reason='Phase 15.4 deletion-pending recipient fixture',
  deletion_requested_at=now(),
  deletion_requested_by='15400100-0000-4000-8000-000000000001',
  deletion_previous_status='ACTIVE'
where user_id='15400500-0000-4000-8000-000000000005';

insert into public.groups (id, name, created_by)
values (
  '15400000-0000-4000-8000-000000000099',
  'Phase 15.4 Broadcast Group',
  '15400100-0000-4000-8000-000000000001'
);
insert into public.group_members (group_id,user_id,role,status) values
  ('15400000-0000-4000-8000-000000000099','15400200-0000-4000-8000-000000000002','MEMBER','ACTIVE'),
  ('15400000-0000-4000-8000-000000000099','15400300-0000-4000-8000-000000000003','MEMBER','ACTIVE'),
  ('15400000-0000-4000-8000-000000000099','15400400-0000-4000-8000-000000000004','MEMBER','ACTIVE');

select set_config('test.phase154_xp_before', (select count(*)::text from public.xp_events), true);

set local role authenticated;
set local request.jwt.claim.sub = '15400200-0000-4000-8000-000000000002';
select throws_ok(
  $$select * from public.preview_platform_message_audience('ALL',null,null,'NOTICE')$$,
  '42501', 'Platform administrator required',
  'ordinary active user cannot preview the global recipient audience'
);

set local request.jwt.claim.sub = '15400100-0000-4000-8000-000000000001';
select results_eq(
  $$select count(*)::bigint from public.search_platform_message_users('154',20)$$,
  array[5::bigint],
  'administrator user search returns all five fixture accounts without Auth secrets'
);
select results_eq(
  $$select eligible_recipient_count from public.search_platform_message_groups('Broadcast',10)$$,
  array[3],
  'group audience search counts only active-account current members'
);
select results_eq(
  $$select recipient_count from public.preview_platform_message_audience(
      'USER','15400200-0000-4000-8000-000000000002',null,'NOTICE'
    )$$,
  array[1],
  'individual preview resolves one active recipient'
);
select throws_ok(
  $$select * from public.preview_platform_message_audience(
      'USER','15400400-0000-4000-8000-000000000004',null,'NOTICE'
    )$$,
  '22023', 'Target account is unavailable for this message type',
  'optional NOTICE cannot target a suspended account'
);
select results_eq(
  $$select recipient_count from public.preview_platform_message_audience(
      'USER','15400400-0000-4000-8000-000000000004',null,'ACCOUNT_STATUS'
    )$$,
  array[1],
  'required account-status message can be retained for a suspended account'
);
select results_eq(
  $$select recipient_count from public.preview_platform_message_audience(
      'USER','15400500-0000-4000-8000-000000000005',null,'ACCOUNT_STATUS'
    )$$,
  array[1],
  'required account-status message can be retained for a deletion-pending account'
);
select results_eq(
  $$select recipient_count from public.preview_platform_message_audience(
      'GROUP',null,'15400000-0000-4000-8000-000000000099','WARNING'
    )$$,
  array[3],
  'group preview excludes suspended current members'
);
select throws_ok(
  $$select * from public.preview_platform_message_audience('ALL',null,null,'WARNING')$$,
  '22023', 'Full-platform blasts must be dismissible notices',
  'full-platform blast cannot become a blocking warning'
);
select results_eq(
  $$select recipient_count = current_setting('test.phase154_active_before')::integer + 3
    from public.preview_platform_message_audience('ALL',null,null,'NOTICE')$$,
  array[true],
  'all-user preview includes every currently active account'
);

select set_config('test.phase154_group_preview', p.preview_id::text, true),
       set_config('test.phase154_group_confirm', p.confirmation_phrase, true)
from public.preview_platform_message_audience(
  'GROUP',null,'15400000-0000-4000-8000-000000000099','NOTICE'
) p;

select throws_ok(
  $$select * from public.send_platform_message(
      current_setting('test.phase154_group_preview')::uuid,
      'Group maintenance','The group leaderboard will refresh tonight.',false,null,
      'WRONG CONFIRMATION','Scheduled maintenance announcement'
    )$$,
  '22023', 'Message confirmation does not match',
  'server rejects a send without exact second confirmation'
);
select lives_ok(
  $$select set_config('test.phase154_group_message', sent.message_id::text, true)
    from public.send_platform_message(
      current_setting('test.phase154_group_preview')::uuid,
      'Group maintenance','The group leaderboard will refresh tonight.',false,null,
      current_setting('test.phase154_group_confirm'),'Scheduled maintenance announcement'
    ) sent$$,
  'confirmed group send succeeds through one set-based server operation'
);

reset role;
select results_eq(
  $$select recipient_count from private.platform_messages
    where id=current_setting('test.phase154_group_message')::uuid$$,
  array[3],
  'group message persists the resolved recipient count'
);
select results_eq(
  $$select count(*)::bigint from private.platform_message_deliveries
    where message_id=current_setting('test.phase154_group_message')::uuid$$,
  array[3::bigint],
  'group fan-out persists one immutable delivery per eligible current member'
);
select results_eq(
  $$select count(*)::bigint from private.platform_message_deliveries
    where message_id=current_setting('test.phase154_group_message')::uuid
      and recipient_user_id='15400400-0000-4000-8000-000000000004'$$,
  array[0::bigint],
  'suspended group member is excluded from optional group fan-out'
);

set local role authenticated;
set local request.jwt.claim.sub = '15400100-0000-4000-8000-000000000001';
select results_eq(
  $$select message_id from public.send_platform_message(
      current_setting('test.phase154_group_preview')::uuid,
      'Ignored retry subject','Ignored retry body is never persisted.',false,null,
      current_setting('test.phase154_group_confirm'),'Retry after lost response'
    )$$,
  array[current_setting('test.phase154_group_message')::uuid],
  'retrying a completed preview returns the original message idempotently'
);

reset role;
select results_eq(
  $$select count(*)::bigint from private.platform_messages
    where id=current_setting('test.phase154_group_message')::uuid$$,
  array[1::bigint],
  'idempotent retry does not create a second message'
);

set local role authenticated;
set local request.jwt.claim.sub = '15400200-0000-4000-8000-000000000002';
select results_eq(
  $$select count(*)::bigint from public.list_my_platform_messages(1,20,false)$$,
  array[1::bigint],
  'first group member sees only their delivery through the inbox RPC'
);
select lives_ok(
  $$select public.mark_platform_message_read(current_setting('test.phase154_group_message')::uuid)$$,
  'recipient can dismiss/read their group notice'
);
select results_eq(
  $$select delivery_state from public.list_my_platform_messages(1,20,false)
    where message_id=current_setting('test.phase154_group_message')::uuid$$,
  array['READ'::text],
  'read action advances the current message revision state'
);
select throws_ok(
  $$select public.acknowledge_platform_message(current_setting('test.phase154_group_message')::uuid)$$,
  '22023', 'Message does not require acknowledgement',
  'recipient cannot fabricate acknowledgement on a notice that does not require it'
);

set local request.jwt.claim.sub = '15400300-0000-4000-8000-000000000003';
select results_eq(
  $$select count(*)::bigint from public.list_my_platform_messages(1,20,false)$$,
  array[1::bigint],
  'second group member independently sees their own unread delivery'
);

set local request.jwt.claim.sub = '15400100-0000-4000-8000-000000000001';
select set_config('test.phase154_warning_preview', p.preview_id::text, true),
       set_config('test.phase154_warning_confirm', p.confirmation_phrase, true)
from public.preview_platform_message_audience(
  'USER','15400200-0000-4000-8000-000000000002',null,'WARNING'
) p;
select lives_ok(
  $$select set_config('test.phase154_warning_message', sent.message_id::text, true)
    from public.send_platform_message(
      current_setting('test.phase154_warning_preview')::uuid,
      'Conduct warning','Please review the community conduct policy before posting again.',true,null,
      current_setting('test.phase154_warning_confirm'),'Moderation warning after case review'
    ) sent$$,
  'administrator can send a targeted acknowledgement-required warning'
);

reset role;
select results_eq(
  $$select count(*)::bigint from private.platform_message_deliveries
    where message_id=current_setting('test.phase154_warning_message')::uuid$$,
  array[1::bigint],
  'targeted warning persists exactly one delivery'
);

set local role authenticated;
set local request.jwt.claim.sub = '15400200-0000-4000-8000-000000000002';
select results_eq(
  $$select count(*)::bigint from public.list_my_platform_messages(1,20,false)$$,
  array[2::bigint],
  'recipient inbox combines targeted and group deliveries without recipient leakage'
);
select lives_ok(
  $$select public.acknowledge_platform_message(current_setting('test.phase154_warning_message')::uuid)$$,
  'recipient can acknowledge the current warning revision'
);
select results_eq(
  $$select delivery_state from public.list_my_platform_messages(1,20,false)
    where message_id=current_setting('test.phase154_warning_message')::uuid$$,
  array['ACKNOWLEDGED'::text],
  'acknowledgement records both read and acknowledged state'
);

set local request.jwt.claim.sub = '15400100-0000-4000-8000-000000000001';
select results_eq(
  $$select revision from public.edit_platform_message(
      current_setting('test.phase154_warning_message')::uuid,
      'Updated conduct warning',
      'Please review the updated community conduct policy before posting again.',
      null,'Clarified the policy reference'
    )$$,
  array[2],
  'editing a sent message creates revision two instead of overwriting history'
);

set local request.jwt.claim.sub = '15400200-0000-4000-8000-000000000002';
select results_eq(
  $$select delivery_state from public.list_my_platform_messages(1,20,false)
    where message_id=current_setting('test.phase154_warning_message')::uuid$$,
  array['DELIVERED'::text],
  'recipient must read and acknowledge a newly edited revision again'
);

reset role;
select results_eq(
  $$select count(*)::bigint from private.platform_message_revisions
    where message_id=current_setting('test.phase154_warning_message')::uuid$$,
  array[2::bigint],
  'both recipient-visible content revisions are retained'
);
select results_eq(
  $$select count(*)::bigint from private.platform_message_events
    where message_id=current_setting('test.phase154_warning_message')::uuid and action='MESSAGE_EDITED'$$,
  array[1::bigint],
  'message edit appends an administrator audit event'
);

set local role authenticated;
set local request.jwt.claim.sub = '15400200-0000-4000-8000-000000000002';
select lives_ok(
  $$select public.acknowledge_platform_message(current_setting('test.phase154_warning_message')::uuid)$$,
  'recipient can acknowledge the edited revision'
);

set local request.jwt.claim.sub = '15400100-0000-4000-8000-000000000001';
select lives_ok(
  $$select public.withdraw_platform_message(
      current_setting('test.phase154_warning_message')::uuid,
      'Warning superseded by direct follow-up'
    )$$,
  'administrator can withdraw a sent message with a reason'
);

set local request.jwt.claim.sub = '15400200-0000-4000-8000-000000000002';
select results_eq(
  $$select count(*)::bigint from public.list_my_platform_messages(1,20,false)
    where message_id=current_setting('test.phase154_warning_message')::uuid$$,
  array[0::bigint],
  'withdrawn message disappears from the recipient inbox without deleting history'
);

reset role;
select results_eq(
  $$select count(*)::bigint from private.platform_message_events
    where message_id=current_setting('test.phase154_warning_message')::uuid and action='MESSAGE_WITHDRAWN'$$,
  array[1::bigint],
  'message withdrawal appends an administrator audit event'
);

set local role authenticated;
set local request.jwt.claim.sub = '15400100-0000-4000-8000-000000000001';
select set_config('test.phase154_blast_preview', p.preview_id::text, true),
       set_config('test.phase154_blast_confirm', p.confirmation_phrase, true)
from public.preview_platform_message_audience('ALL',null,null,'NOTICE') p;
select throws_ok(
  $$select * from public.send_platform_message(
      current_setting('test.phase154_blast_preview')::uuid,
      'Version update','A new version of the workout game is now available.',true,null,
      current_setting('test.phase154_blast_confirm'),'Release announcement'
    )$$,
  '22023', 'Full-platform blasts are dismissible and cannot require acknowledgement',
  'full-platform what-is-new popup cannot demand acknowledgement'
);
select lives_ok(
  $$select set_config('test.phase154_blast_message', sent.message_id::text, true)
    from public.send_platform_message(
      current_setting('test.phase154_blast_preview')::uuid,
      'Version update','A new version of the workout game is now available.',false,null,
      current_setting('test.phase154_blast_confirm'),'Release announcement'
    ) sent$$,
  'administrator can send a dismissible full-platform update popup'
);

reset role;
select results_eq(
  $$select count(*) = current_setting('test.phase154_active_before')::bigint + 3
    from private.platform_message_deliveries
    where message_id=current_setting('test.phase154_blast_message')::uuid$$,
  array[true],
  'full-platform blast persists the previewed active-account audience'
);

set local role authenticated;
set local request.jwt.claim.sub = '15400200-0000-4000-8000-000000000002';
select results_eq(
  $$select audience_type::text from public.list_my_platform_messages(1,20,false)
    where message_id=current_setting('test.phase154_blast_message')::uuid$$,
  array['ALL'::text],
  'user inbox identifies the unread full-platform delivery for popup presentation'
);
select lives_ok(
  $$select public.mark_platform_message_read(current_setting('test.phase154_blast_message')::uuid)$$,
  'dismissing the what-is-new popup records the blast as read'
);
select results_eq(
  $$select delivery_state from public.list_my_platform_messages(1,20,false)
    where message_id=current_setting('test.phase154_blast_message')::uuid$$,
  array['READ'::text],
  'dismissed full-platform blast will not reopen on the next inbox load'
);

set local request.jwt.claim.sub = '15400100-0000-4000-8000-000000000001';
select set_config('test.phase154_suspended_preview', p.preview_id::text, true),
       set_config('test.phase154_suspended_confirm', p.confirmation_phrase, true)
from public.preview_platform_message_audience(
  'USER','15400400-0000-4000-8000-000000000004',null,'ACCOUNT_STATUS'
) p;
select lives_ok(
  $$select set_config('test.phase154_suspended_message', sent.message_id::text, true)
    from public.send_platform_message(
      current_setting('test.phase154_suspended_preview')::uuid,
      'Account status update','Your account is suspended while a policy review is completed.',false,null,
      current_setting('test.phase154_suspended_confirm'),'Required suspension status notice'
    ) sent$$,
  'required account notice is durably delivered to a suspended account'
);

reset role;
select results_eq(
  $$select account_status_at_delivery::text from private.platform_message_deliveries
    where message_id=current_setting('test.phase154_suspended_message')::uuid$$,
  array['SUSPENDED'::text],
  'suspended delivery records the non-active account state snapshot'
);

set local role authenticated;
set local request.jwt.claim.sub = '15400400-0000-4000-8000-000000000004';
select throws_ok(
  $$select * from public.list_my_platform_messages(1,20,false)$$,
  '42501', 'Active account required',
  'suspended user cannot bypass platform access enforcement to open the PWA inbox'
);

set local request.jwt.claim.sub = '15400100-0000-4000-8000-000000000001';
select results_eq(
  $$select count(*)::bigint from public.list_platform_messages(1,50)$$,
  array[4::bigint],
  'administrator delivery overview retains group, warning, blast, and account-status sends'
);

reset role;
select results_eq(
  $$select count(*)::bigint from private.platform_message_events where action='MESSAGE_SENT'$$,
  array[4::bigint],
  'every successful message send appends one audit event'
);
select results_eq(
  $$select bool_and(retention_until >= occurred_at + interval '2 years')::text
    from private.platform_message_events$$,
  array['true'::text],
  'message send/edit/withdraw audit has a minimum two-year retention boundary'
);
select results_eq(
  $$select (count(*) = current_setting('test.phase154_xp_before')::bigint)::text from public.xp_events$$,
  array['true'::text],
  'administrator messaging does not create or alter XP events'
);

set local role authenticated;
set local request.jwt.claim.sub = '15400100-0000-4000-8000-000000000001';
select set_config(
  'test.phase154_activity_access',
  (select access_id::text from public.begin_moderation_activity_review(
    '15400200-0000-4000-8000-000000000002',
    'Review administrator communication context',
    null,
    array['COMMUNICATION'::public.moderation_activity_type]
  )),
  true
);
select results_eq(
  $$select (count(*) >= 2)::text from public.list_moderation_activity_review(
      current_setting('test.phase154_activity_access')::uuid,null,null,25
    ) where activity_type='COMMUNICATION'$$,
  array['true'::text],
  'purpose-bounded moderation timeline includes retained communication activity'
);

set local request.jwt.claim.sub = '15400200-0000-4000-8000-000000000002';
select throws_ok(
  $$select * from public.list_platform_messages(1,20)$$,
  '42501', 'Platform administrator required',
  'ordinary user cannot read administrator delivery aggregates'
);

reset role;
select throws_ok(
  $$update private.platform_message_deliveries
    set recipient_username_snapshot='tampered154'
    where message_id=current_setting('test.phase154_group_message')::uuid
      and recipient_user_id='15400200-0000-4000-8000-000000000002'$$,
  '42501', 'Platform message delivery identity and progress are immutable',
  'delivery identity cannot be rewritten'
);
select throws_ok(
  $$update private.platform_message_revisions
    set subject='Tampered subject'
    where message_id=current_setting('test.phase154_group_message')::uuid and revision=1$$,
  '42501', 'Platform message history is immutable',
  'sent content revision cannot be overwritten'
);
select throws_ok(
  $$delete from private.platform_message_events
    where message_id=current_setting('test.phase154_group_message')::uuid$$,
  '42501', 'Platform message history is immutable',
  'administrator message audit cannot be deleted'
);

select * from finish();
rollback;
