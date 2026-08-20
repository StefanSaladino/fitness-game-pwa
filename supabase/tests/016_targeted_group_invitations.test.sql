begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

select has_column('public','profiles','profile_code','profiles expose a stable invite ID');
select has_column('public','group_invites','invited_user_id','group invites target exactly one user');
select is(to_regprocedure('public.join_group_by_invite(uuid)') is null,true,'legacy reusable join RPC is removed');
select has_function('public','create_group_invite',array['uuid','text'],'targeted invite creator exists');
select has_function('public','get_group_pending_invites',array['uuid'],'outgoing pending invite reader exists');
select has_function('public','get_my_pending_group_invites',array[]::text[],'recipient inbox exists');
select has_function('public','accept_group_invite',array['uuid'],'accept RPC exists');
select has_function('public','decline_group_invite',array['uuid'],'decline RPC exists');
select has_function('public','revoke_group_invite',array['uuid'],'revoke RPC exists');
select is(has_function_privilege('authenticated','public.create_group_invite(uuid,text)','execute'),true,'authenticated can create targeted invites');
select is(has_function_privilege('anon','public.create_group_invite(uuid,text)','execute'),false,'anon cannot create targeted invites');
select is(has_table_privilege('authenticated','public.group_invites','insert'),false,'browser cannot directly insert invites');
select is(has_table_privilege('authenticated','public.group_invites','update'),false,'browser cannot directly update invites');
select is(has_table_privilege('authenticated','public.group_invites','delete'),false,'browser cannot directly delete invites');

insert into auth.users (id,email) values
 ('71111111-1111-4111-8111-111111111111','invite-owner@test.local'),
 ('72222222-2222-4222-8222-222222222222','invite-target@test.local'),
 ('73333333-3333-4333-8333-333333333333','invite-decline@test.local'),
 ('74444444-4444-4444-8444-444444444444','invite-revoke@test.local');
update public.profiles set username='invite_owner', profile_code='FG-OWNER00001' where id='71111111-1111-4111-8111-111111111111';
update public.profiles set username='invite_target', profile_code='FG-TARGET0001' where id='72222222-2222-4222-8222-222222222222';
update public.profiles set username='invite_decline', profile_code='FG-DECLINE001' where id='73333333-3333-4333-8333-333333333333';
update public.profiles set username='invite_revoke', profile_code='FG-REVOKE0001' where id='74444444-4444-4444-8444-444444444444';
insert into public.groups(id,name,created_by) values('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Targeted Crew','71111111-1111-4111-8111-111111111111');

set local role authenticated;
set local request.jwt.claim.sub='73333333-3333-4333-8333-333333333333';
select throws_ok($$select public.create_group_invite('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','invite_target')$$,'42501','Not a group administrator','outsider cannot create an invitation');
select throws_ok($$select * from public.get_group_pending_invites('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,'42501','Not a group administrator','outsider cannot read group pending invitations');

set local request.jwt.claim.sub='71111111-1111-4111-8111-111111111111';
select lives_ok($$select public.create_group_invite('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','@invite_target')$$,'owner can invite by username');
select results_eq($$select count(*) from public.get_group_pending_invites('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') where invited_user_id='72222222-2222-4222-8222-222222222222'$$,array[1::bigint],'username invite creates one targeted pending row');
select lives_ok($$select public.create_group_invite('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','FG-TARGET0001')$$,'stable profile invite ID resolves the same recipient');
select results_eq($$select count(*) from public.get_group_pending_invites('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') where invited_user_id='72222222-2222-4222-8222-222222222222'$$,array[1::bigint],'duplicate targeted invite is idempotent');

set local request.jwt.claim.sub='72222222-2222-4222-8222-222222222222';
select lives_ok($$select public.accept_group_invite((select id from public.get_my_pending_group_invites() where group_id='7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'))$$,'recipient can accept own pending invitation');
select results_eq($$select count(*) from public.group_members where group_id='7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and user_id='72222222-2222-4222-8222-222222222222' and status='ACTIVE' and role='MEMBER'$$,array[1::bigint],'acceptance creates active member');
select results_eq($$select count(*) from public.get_my_pending_group_invites() where group_id='7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,array[0::bigint],'accepted invite is removed from recipient inbox');

set local request.jwt.claim.sub='71111111-1111-4111-8111-111111111111';
select lives_ok($$select public.create_group_invite('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','invite_decline')$$,'owner can create another targeted invitation');
set local request.jwt.claim.sub='73333333-3333-4333-8333-333333333333';
select lives_ok($$select public.decline_group_invite((select id from public.get_my_pending_group_invites() where group_id='7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'))$$,'recipient can decline own invitation');
select results_eq($$select count(*) from public.get_my_pending_group_invites() where group_id='7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,array[0::bigint],'declined invite is removed from recipient inbox');

set local request.jwt.claim.sub='71111111-1111-4111-8111-111111111111';
select lives_ok($$select public.create_group_invite('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','FG-REVOKE0001')$$,'owner can create invitation by profile ID');
select lives_ok($$select public.revoke_group_invite((select id from public.get_group_pending_invites('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') where invited_user_id='74444444-4444-4444-8444-444444444444'))$$,'group administrator can revoke a pending invitation');
select results_eq($$select count(*) from public.get_group_pending_invites('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') where invited_user_id='74444444-4444-4444-8444-444444444444'$$,array[0::bigint],'revoked invite is removed from administrator pending list');

select * from finish();
rollback;
