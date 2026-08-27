begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

select has_column('private', 'platform_message_deliveries', 'deleted_at', 'delivery row stores a recipient-only deletion tombstone');
select has_function('public', 'delete_my_platform_message', array['uuid'], 'recipient inbox deletion RPC exists');
select results_eq(
  $$select count(*)::bigint from pg_indexes where schemaname='private' and indexname='platform_message_deliveries_visible_recipient_idx'$$,
  array[1::bigint],
  'visible recipient inbox lookup has a partial index'
);
select is(has_function_privilege('authenticated', 'public.delete_my_platform_message(uuid)', 'execute'), true, 'authenticated recipients can reach the guarded deletion RPC');
select is(has_function_privilege('anon', 'public.delete_my_platform_message(uuid)', 'execute'), false, 'anonymous callers cannot delete inbox messages');
select results_eq(
  $$select (p.prosecdef and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%')::text
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='delete_my_platform_message'$$,
  array['true'::text],
  'recipient deletion is security-definer with a pinned empty search path'
);

insert into auth.users(id, email, last_sign_in_at) values
  ('16900100-0000-4000-8000-000000000001', 'inbox-admin@test.local', now()),
  ('16900200-0000-4000-8000-000000000002', 'inbox-one@test.local', now()),
  ('16900300-0000-4000-8000-000000000003', 'inbox-two@test.local', now());

update public.profiles
set
  username = case id
    when '16900100-0000-4000-8000-000000000001'::uuid then 'inboxadmin'
    when '16900200-0000-4000-8000-000000000002'::uuid then 'inboxone'
    else 'inboxtwo'
  end,
  display_name = case id
    when '16900100-0000-4000-8000-000000000001'::uuid then 'Inbox Admin'
    when '16900200-0000-4000-8000-000000000002'::uuid then 'Inbox One'
    else 'Inbox Two'
  end
where id in (
  '16900100-0000-4000-8000-000000000001',
  '16900200-0000-4000-8000-000000000002',
  '16900300-0000-4000-8000-000000000003'
);

insert into private.platform_admins(user_id, granted_by, grant_reason)
values ('16900100-0000-4000-8000-000000000001', null, 'Recipient inbox deletion contract');

insert into public.groups(id, name, created_by)
values ('16900000-0000-4000-8000-000000000099', 'Inbox Test Crew', '16900100-0000-4000-8000-000000000001');
insert into public.group_members(group_id, user_id, role, status) values
  ('16900000-0000-4000-8000-000000000099', '16900200-0000-4000-8000-000000000002', 'MEMBER', 'ACTIVE'),
  ('16900000-0000-4000-8000-000000000099', '16900300-0000-4000-8000-000000000003', 'MEMBER', 'ACTIVE');

select set_config('test.inbox_delete_xp_before', (select count(*)::text from public.xp_events), true);

set local role authenticated;
set local request.jwt.claim.sub = '16900100-0000-4000-8000-000000000001';
select set_config('test.inbox_group_preview', p.preview_id::text, true),
       set_config('test.inbox_group_confirm', p.confirmation_phrase, true)
from public.preview_platform_message_audience(
  'GROUP', null, '16900000-0000-4000-8000-000000000099', 'NOTICE'
) p;
select lives_ok(
  $$select set_config('test.inbox_group_message', sent.message_id::text, true)
    from public.send_platform_message(
      current_setting('test.inbox_group_preview')::uuid,
      'Crew update', 'Tonight''s group leaderboard refresh is scheduled.', false, null,
      current_setting('test.inbox_group_confirm'), 'Recipient deletion isolation test'
    ) sent$$,
  'administrator sends one shared group message'
);

reset role;
select results_eq(
  $$select count(*)::bigint from private.platform_message_deliveries where message_id=current_setting('test.inbox_group_message')::uuid$$,
  array[3::bigint],
  'shared group message retains owner and member recipient deliveries'
);

set local role authenticated;
set local request.jwt.claim.sub = '16900200-0000-4000-8000-000000000002';
select results_eq(
  $$select count(*)::bigint from public.list_my_platform_messages(1,20,false) where message_id=current_setting('test.inbox_group_message')::uuid$$,
  array[1::bigint],
  'first recipient initially sees the shared message'
);
select lives_ok(
  $$select public.delete_my_platform_message(current_setting('test.inbox_group_message')::uuid)$$,
  'first recipient can delete an ordinary received message'
);
select results_eq(
  $$select count(*)::bigint from public.list_my_platform_messages(1,20,false) where message_id=current_setting('test.inbox_group_message')::uuid$$,
  array[0::bigint],
  'deleted delivery disappears from the first recipient inbox'
);

set local request.jwt.claim.sub = '16900300-0000-4000-8000-000000000003';
select results_eq(
  $$select count(*)::bigint from public.list_my_platform_messages(1,20,false) where message_id=current_setting('test.inbox_group_message')::uuid$$,
  array[1::bigint],
  'first recipient deletion does not affect the second recipient inbox'
);

reset role;
select results_eq(
  $$select count(*)::bigint from private.platform_message_deliveries
    where message_id=current_setting('test.inbox_group_message')::uuid and deleted_at is not null$$,
  array[1::bigint],
  'exactly one recipient delivery receives a tombstone'
);
select results_eq(
  $$select count(*)::bigint from private.platform_messages where id=current_setting('test.inbox_group_message')::uuid$$,
  array[1::bigint],
  'shared administrator message remains retained after recipient deletion'
);
select results_eq(
  $$select count(*)::bigint from private.platform_message_events where message_id=current_setting('test.inbox_group_message')::uuid and action='MESSAGE_SENT'$$,
  array[1::bigint],
  'administrator send audit remains retained after recipient deletion'
);

set local role authenticated;
set local request.jwt.claim.sub = '16900200-0000-4000-8000-000000000002';
select throws_ok(
  $$select public.mark_platform_message_read(current_setting('test.inbox_group_message')::uuid)$$,
  '22023', 'Inbox message not found or unavailable',
  'a deleted delivery cannot be mutated through the read RPC'
);
select lives_ok(
  $$select public.delete_my_platform_message(current_setting('test.inbox_group_message')::uuid)$$,
  'recipient deletion is idempotent after the tombstone exists'
);

set local request.jwt.claim.sub = '16900100-0000-4000-8000-000000000001';
select set_config('test.inbox_required_preview', p.preview_id::text, true),
       set_config('test.inbox_required_confirm', p.confirmation_phrase, true)
from public.preview_platform_message_audience(
  'USER', '16900200-0000-4000-8000-000000000002', null, 'ACTION_REQUIRED'
) p;
select lives_ok(
  $$select set_config('test.inbox_required_message', sent.message_id::text, true)
    from public.send_platform_message(
      current_setting('test.inbox_required_preview')::uuid,
      'Review required', 'Please review and acknowledge this account action.', true, null,
      current_setting('test.inbox_required_confirm'), 'Acknowledgement deletion gate test'
    ) sent$$,
  'administrator sends an acknowledgement-required message'
);

set local request.jwt.claim.sub = '16900200-0000-4000-8000-000000000002';
select throws_ok(
  $$select public.delete_my_platform_message(current_setting('test.inbox_required_message')::uuid)$$,
  '22023', 'Acknowledge this message before deleting it',
  'required current revision cannot be deleted before acknowledgement'
);
select lives_ok(
  $$select public.acknowledge_platform_message(current_setting('test.inbox_required_message')::uuid)$$,
  'recipient acknowledges the required current revision'
);
select lives_ok(
  $$select public.delete_my_platform_message(current_setting('test.inbox_required_message')::uuid)$$,
  'acknowledged required message can be deleted from the recipient inbox'
);
select results_eq(
  $$select count(*)::bigint from public.list_my_platform_messages(1,20,false)$$,
  array[0::bigint],
  'both recipient-deleted messages remain absent from the first inbox'
);

reset role;
select results_eq(
  $$select (pmd.deleted_at is not null and pmd.acknowledged_revision=pm.current_revision)::text
    from private.platform_message_deliveries pmd
    join private.platform_messages pm on pm.id=pmd.message_id
    where pmd.message_id=current_setting('test.inbox_required_message')::uuid
      and pmd.recipient_user_id='16900200-0000-4000-8000-000000000002'$$,
  array['true'::text],
  'required delivery retains acknowledgement progress alongside its deletion tombstone'
);
select throws_ok(
  $$update private.platform_message_deliveries set deleted_at=null
    where message_id=current_setting('test.inbox_group_message')::uuid
      and recipient_user_id='16900200-0000-4000-8000-000000000002'$$,
  '42501', 'Platform message delivery identity and progress are immutable',
  'recipient deletion tombstone cannot be cleared or rewritten'
);
select throws_ok(
  $$delete from private.platform_message_deliveries
    where message_id=current_setting('test.inbox_group_message')::uuid
      and recipient_user_id='16900200-0000-4000-8000-000000000002'$$,
  '42501', 'Platform message deliveries are retained',
  'recipient deletion never hard-deletes the retained delivery row'
);
select results_eq(
  $$select count(*)::bigint from private.platform_message_deliveries
    where message_id in (
      current_setting('test.inbox_group_message')::uuid,
      current_setting('test.inbox_required_message')::uuid
    )$$,
  array[4::bigint],
  'all original recipient delivery rows remain retained'
);
select results_eq(
  $$select (count(*)=current_setting('test.inbox_delete_xp_before')::bigint)::text from public.xp_events$$,
  array['true'::text],
  'inbox deletion does not create or alter XP events'
);

select * from finish();
rollback;
