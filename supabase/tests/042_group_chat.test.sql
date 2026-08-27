begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

select has_table('public', 'group_chat_messages', 'group chat messages table exists');
select has_table('public', 'group_chat_reactions', 'group chat reactions table exists');
select has_column('public', 'group_chat_messages', 'deleted_at', 'group chat retains deleted-message tombstones');
select has_function('public', 'list_group_chat_messages', array['uuid','integer','timestamp with time zone','uuid'], 'cursor-paginated group chat list RPC exists');
select has_function('public', 'post_group_chat_message', array['uuid','text'], 'group chat post RPC exists');
select has_function('public', 'set_group_chat_reaction', array['uuid','uuid','text'], 'group chat reaction RPC exists');
select has_function('public', 'delete_group_chat_message', array['uuid','uuid'], 'group chat deletion RPC exists');
select results_eq(
  $$select bool_and(c.relrowsecurity)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('group_chat_messages','group_chat_reactions')$$,
  array['true'::text],
  'both public chat tables have RLS enabled'
);
select is(has_table_privilege('authenticated', 'public.group_chat_messages', 'select'), false, 'browser role cannot select chat rows directly');
select is(has_table_privilege('authenticated', 'public.group_chat_reactions', 'insert'), false, 'browser role cannot insert reaction rows directly');
select is(has_function_privilege('authenticated', 'public.list_group_chat_messages(uuid,integer,timestamp with time zone,uuid)', 'execute'), true, 'authenticated members can reach guarded chat reads');
select is(has_function_privilege('anon', 'public.post_group_chat_message(uuid,text)', 'execute'), false, 'anonymous callers cannot post group messages');
select results_eq(
  $$select count(*)::bigint from pg_policies where schemaname='realtime' and tablename='messages' and policyname='group chat members can receive change signals'$$,
  array[1::bigint],
  'private Realtime broadcast reception is membership-gated'
);
select results_eq(
  $$select count(*)::bigint from pg_trigger where not tgisinternal and tgname in ('group_chat_messages_broadcast_change','group_chat_reactions_broadcast_change')$$,
  array[2::bigint],
  'message and reaction writes emit content-free change signals'
);
select results_eq(
  $$select count(*)::bigint from pg_indexes where schemaname='public' and indexname in (
    'group_chat_messages_group_created_idx','group_chat_messages_author_created_idx',
    'group_chat_reactions_message_type_idx','group_chat_reactions_group_user_idx',
    'group_chat_reactions_group_message_idx','group_chat_reactions_user_idx'
  )$$,
  array[6::bigint],
  'chat pagination, rate limiting, reaction aggregation, and foreign keys are indexed'
);
select results_eq(
  $$select bool_and(p.prosecdef and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%')::text
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'list_group_chat_messages','post_group_chat_message','set_group_chat_reaction','delete_group_chat_message'
    )$$,
  array['true'::text],
  'every exposed chat mutation/read RPC is security-definer with a pinned search path'
);
select results_eq(
  $$select public.group_chat_topic_group_id('group-chat:17000000-0000-4000-8000-000000000099')$$,
  array['17000000-0000-4000-8000-000000000099'::uuid],
  'valid private chat topic resolves its group id'
);
select results_eq(
  $$select public.group_chat_topic_group_id('group-chat:not-a-uuid') is null$$,
  array[true],
  'malformed private chat topic fails closed without a UUID cast error'
);

insert into auth.users(id, email, last_sign_in_at) values
  ('17000100-0000-4000-8000-000000000001', 'chat-owner@test.local', now()),
  ('17000200-0000-4000-8000-000000000002', 'chat-member@test.local', now()),
  ('17000300-0000-4000-8000-000000000003', 'chat-outsider@test.local', now()),
  ('17000400-0000-4000-8000-000000000004', 'chat-rate@test.local', now());

update public.profiles
set
  username = case id
    when '17000100-0000-4000-8000-000000000001'::uuid then 'chatowner'
    when '17000200-0000-4000-8000-000000000002'::uuid then 'chatmember'
    when '17000300-0000-4000-8000-000000000003'::uuid then 'chatoutsider'
    else 'chatrate'
  end,
  display_name = case id
    when '17000100-0000-4000-8000-000000000001'::uuid then 'Chat Owner'
    when '17000200-0000-4000-8000-000000000002'::uuid then 'Chat Member'
    when '17000300-0000-4000-8000-000000000003'::uuid then 'Chat Outsider'
    else 'Chat Rate'
  end
where id in (
  '17000100-0000-4000-8000-000000000001',
  '17000200-0000-4000-8000-000000000002',
  '17000300-0000-4000-8000-000000000003',
  '17000400-0000-4000-8000-000000000004'
);

insert into public.groups(id, name, created_by)
values ('17000000-0000-4000-8000-000000000099', 'Group Chat Crew', '17000100-0000-4000-8000-000000000001');
insert into public.group_members(group_id, user_id, role, status) values
  ('17000000-0000-4000-8000-000000000099', '17000200-0000-4000-8000-000000000002', 'MEMBER', 'ACTIVE'),
  ('17000000-0000-4000-8000-000000000099', '17000400-0000-4000-8000-000000000004', 'MEMBER', 'ACTIVE');

select set_config('test.group_chat_xp_before', (select count(*)::text from public.xp_events), true);

set local role authenticated;
set local request.jwt.claim.sub = '17000100-0000-4000-8000-000000000001';
select lives_ok(
  $$select set_config('test.group_chat_owner_message', public.post_group_chat_message(
    '17000000-0000-4000-8000-000000000099', 'Great training today. Who is lifting tomorrow?'
  )::text, true)$$,
  'owner can post plain text to the group conversation'
);

set local request.jwt.claim.sub = '17000200-0000-4000-8000-000000000002';
select results_eq(
  $$select body from public.list_group_chat_messages('17000000-0000-4000-8000-000000000099',30,null,null)
    where message_id=current_setting('test.group_chat_owner_message')::uuid$$,
  array['Great training today. Who is lifting tomorrow?'::text],
  'active member can read the group message body'
);
select throws_ok(
  $$select public.delete_group_chat_message(
    '17000000-0000-4000-8000-000000000099', current_setting('test.group_chat_owner_message')::uuid
  )$$,
  '42501', 'Only the author or a group administrator can delete this message',
  'ordinary member cannot delete another member message'
);

set local request.jwt.claim.sub = '17000300-0000-4000-8000-000000000003';
select throws_ok(
  $$select * from public.list_group_chat_messages('17000000-0000-4000-8000-000000000099',30,null,null)$$,
  '42501', 'Active group membership required',
  'outsider cannot read group chat'
);
select throws_ok(
  $$select public.post_group_chat_message('17000000-0000-4000-8000-000000000099','Outsider post')$$,
  '42501', 'Active group membership required',
  'outsider cannot post to group chat'
);
select throws_ok(
  $$select * from public.group_chat_messages$$,
  '42501', null,
  'authenticated browser cannot bypass RPC membership checks with direct table access'
);

set local request.jwt.claim.sub = '17000200-0000-4000-8000-000000000002';
select lives_ok(
  $$select set_config('test.group_chat_member_message', public.post_group_chat_message(
    '17000000-0000-4000-8000-000000000099', 'I am in for tomorrow morning.'
  )::text, true)$$,
  'member can post to the group conversation'
);
select throws_ok(
  $$select public.post_group_chat_message(
    '17000000-0000-4000-8000-000000000099', 'I am in for tomorrow morning.'
  )$$,
  '22023', 'This group message was already posted',
  'duplicate message is rejected inside the anti-spam window'
);
select results_eq(
  $$select count(*)::bigint from public.list_group_chat_messages('17000000-0000-4000-8000-000000000099',1,null,null)$$,
  array[1::bigint],
  'chat list obeys its requested page size'
);
select results_eq(
  $$with newest as (
      select created_at, message_id from public.list_group_chat_messages('17000000-0000-4000-8000-000000000099',1,null,null)
    )
    select count(*)::bigint from newest n
    cross join lateral public.list_group_chat_messages(
      '17000000-0000-4000-8000-000000000099', 1, n.created_at, n.message_id
    ) older$$,
  array[1::bigint],
  'tuple cursor loads the next older message without duplication'
);
select lives_ok(
  $$select public.set_group_chat_reaction(
    '17000000-0000-4000-8000-000000000099', current_setting('test.group_chat_owner_message')::uuid, 'FIRE'
  )$$,
  'active member can react to an available group message'
);
select results_eq(
  $$select (fire_count=1 and my_reaction='FIRE')::text
    from public.list_group_chat_messages('17000000-0000-4000-8000-000000000099',30,null,null)
    where message_id=current_setting('test.group_chat_owner_message')::uuid$$,
  array['true'::text],
  'chat read returns bounded reaction count and caller selection'
);
select lives_ok(
  $$select public.set_group_chat_reaction(
    '17000000-0000-4000-8000-000000000099', current_setting('test.group_chat_owner_message')::uuid, 'HEART'
  )$$,
  'switching reaction updates the same member/message slot'
);
select results_eq(
  $$select (fire_count=0 and heart_count=1 and my_reaction='HEART')::text
    from public.list_group_chat_messages('17000000-0000-4000-8000-000000000099',30,null,null)
    where message_id=current_setting('test.group_chat_owner_message')::uuid$$,
  array['true'::text],
  'switching reactions does not stack the previous emoji'
);
select lives_ok(
  $$select public.set_group_chat_reaction(
    '17000000-0000-4000-8000-000000000099', current_setting('test.group_chat_owner_message')::uuid, null
  )$$,
  'null reaction removes the caller reaction'
);
select throws_ok(
  $$select public.set_group_chat_reaction(
    '17000000-0000-4000-8000-000000000099', current_setting('test.group_chat_owner_message')::uuid, 'ANGRY'
  )$$,
  '22023', 'Unsupported group chat reaction',
  'reaction catalog is intentionally bounded'
);
select lives_ok(
  $$select public.delete_group_chat_message(
    '17000000-0000-4000-8000-000000000099', current_setting('test.group_chat_member_message')::uuid
  )$$,
  'author can delete their own group message'
);
select results_eq(
  $$select (body is null and deleted_at is not null and not can_delete)::text
    from public.list_group_chat_messages('17000000-0000-4000-8000-000000000099',30,null,null)
    where message_id=current_setting('test.group_chat_member_message')::uuid$$,
  array['true'::text],
  'deleted message remains as a body-free tombstone for conversation continuity'
);
select throws_ok(
  $$select public.set_group_chat_reaction(
    '17000000-0000-4000-8000-000000000099', current_setting('test.group_chat_member_message')::uuid, 'CLAP'
  )$$,
  '22023', 'Group message is not available',
  'deleted group message cannot receive new reactions'
);
select lives_ok(
  $$select set_config('test.group_chat_moderated_message', public.post_group_chat_message(
    '17000000-0000-4000-8000-000000000099', 'A second member message for moderation.'
  )::text, true)$$,
  'member can post another distinct message'
);

set local request.jwt.claim.sub = '17000100-0000-4000-8000-000000000001';
select lives_ok(
  $$select public.delete_group_chat_message(
    '17000000-0000-4000-8000-000000000099', current_setting('test.group_chat_moderated_message')::uuid
  )$$,
  'group owner can moderate another member message'
);

reset role;
select results_eq(
  $$select deletion_reason from public.group_chat_messages where id=current_setting('test.group_chat_moderated_message')::uuid$$,
  array['MODERATION'::text],
  'moderated message records a durable moderation tombstone reason'
);

set local role authenticated;
set local request.jwt.claim.sub = '17000400-0000-4000-8000-000000000004';
select lives_ok(
  $$select public.post_group_chat_message('17000000-0000-4000-8000-000000000099','Rate message 1')$$,
  'rate-limit member can post before reaching the rolling threshold'
);

reset role;
insert into public.group_chat_messages(group_id, author_user_id, body, created_at)
select
  '17000000-0000-4000-8000-000000000099',
  '17000400-0000-4000-8000-000000000004',
  'Rate fixture ' || value,
  now()
from generate_series(2, 10) value;

set local role authenticated;
set local request.jwt.claim.sub = '17000400-0000-4000-8000-000000000004';
select throws_ok(
  $$select public.post_group_chat_message('17000000-0000-4000-8000-000000000099','Rate message 11')$$,
  '22023', 'Group chat rate limit reached; try again shortly',
  'eleventh rolling-minute message is rate limited'
);

reset role;
update public.group_members
set status='REMOVED', removed_at=now()
where group_id='17000000-0000-4000-8000-000000000099'
  and user_id='17000200-0000-4000-8000-000000000002';

set local role authenticated;
set local request.jwt.claim.sub = '17000200-0000-4000-8000-000000000002';
select throws_ok(
  $$select * from public.list_group_chat_messages('17000000-0000-4000-8000-000000000099',30,null,null)$$,
  '42501', 'Active group membership required',
  'removed member immediately loses authoritative chat read access'
);
select throws_ok(
  $$select public.post_group_chat_message('17000000-0000-4000-8000-000000000099','Post after removal')$$,
  '42501', 'Active group membership required',
  'removed member immediately loses authoritative chat write access'
);

reset role;
select results_eq(
  $$select (count(*)=current_setting('test.group_chat_xp_before')::bigint)::text from public.xp_events$$,
  array['true'::text],
  'group chat messages and reactions never create or alter XP events'
);

select * from finish();
rollback;
