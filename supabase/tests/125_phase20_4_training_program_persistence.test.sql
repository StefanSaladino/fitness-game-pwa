begin;
create extension if not exists pgtap with schema extensions;

select plan(35);

select has_table('public','training_programs','training programs table exists');
select has_table('public','training_program_workouts','planned workouts table exists');
select has_table('public','training_program_exercises','program exercises table exists');

select is((select relrowsecurity from pg_class where oid='public.training_programs'::regclass),true,'training programs enforce RLS');
select is((select relrowsecurity from pg_class where oid='public.training_program_workouts'::regclass),true,'program workouts enforce RLS');
select is((select relrowsecurity from pg_class where oid='public.training_program_exercises'::regclass),true,'program exercises enforce RLS');

select is(has_table_privilege('authenticated','public.training_programs','select'),true,'authenticated may read owned programs');
select is(has_table_privilege('authenticated','public.training_programs','insert'),false,'browser cannot insert programs directly');
select is(has_table_privilege('authenticated','public.training_program_workouts','update'),false,'browser cannot mutate planned workouts directly');
select is(has_table_privilege('authenticated','public.training_program_exercises','delete'),false,'browser cannot delete program exercises directly');

select has_function('public','create_my_training_program',array['jsonb'],'create program RPC exists');
select has_function('public','set_my_training_program_status',array['uuid','text','bigint'],'program status RPC exists');
select has_function('public','launch_my_training_program_workout',array['uuid','timestamp with time zone'],'program launch RPC exists');
select has_function('public','link_my_training_program_own_workout',array['uuid','uuid'],'own-workout link RPC exists');
select has_function('public','mark_my_training_program_workout_missed',array['uuid'],'missed-workout RPC exists');

select is(has_function_privilege('authenticated','public.create_my_training_program(jsonb)','execute'),true,'authenticated may create own program through guarded RPC');
select is(has_function_privilege('anon','public.create_my_training_program(jsonb)','execute'),false,'anon cannot create programs');
select is(has_function_privilege('public','public.create_my_training_program(jsonb)','execute'),false,'PUBLIC has no implicit program-create execution');

select ok(
  exists(
    select 1 from pg_indexes
    where schemaname='public'
      and indexname='training_programs_one_active_per_user'
      and indexdef like '%WHERE (status = ''ACTIVE''::text)%'
  ),
  'at most one active program per user is enforced'
);

select ok(
  exists(
    select 1 from pg_constraint
    where conrelid='public.training_program_exercises'::regclass
      and pg_get_constraintdef(oid) like '%exercise_catalog(id) ON DELETE RESTRICT%'
  ),
  'program exercise catalogue references do not cascade-delete'
);

select ok(
  exists(
    select 1 from pg_trigger
    where tgrelid='public.workout_sessions'::regclass
      and tgname='sync_training_program_workout_execution'
      and not tgisinternal
  ),
  'ordinary workout completion/cancellation sync trigger exists'
);

select is(
  (select prosecdef from pg_proc where oid='public.create_my_training_program(jsonb)'::regprocedure),
  true,
  'program create mutation is an intentional security-definer boundary'
);
select is(
  (select proconfig=array['search_path=""'] from pg_proc where oid='public.create_my_training_program(jsonb)'::regprocedure),
  true,
  'program create RPC pins empty search path'
);
select is(
  (select proconfig=array['search_path=""'] from pg_proc where oid='public.launch_my_training_program_workout(uuid,timestamptz)'::regprocedure),
  true,
  'program launch RPC pins empty search path'
);

insert into auth.users(id,email,last_sign_in_at)
values
  ('20420001-1111-4111-8111-111111111111','phase204-owner@test.local',now()),
  ('20420002-2222-4222-8222-222222222222','phase204-other@test.local',now());

update public.profiles
set username=case id
      when '20420001-1111-4111-8111-111111111111'::uuid then 'phase204_owner'
      else 'phase204_other'
    end,
    display_name='Phase 20.4 fixture',
    timezone='America/Toronto',
    weekly_workout_target=4,
    onboarding_completed_at=now()
where id in (
  '20420001-1111-4111-8111-111111111111',
  '20420002-2222-4222-8222-222222222222'
);

insert into public.training_programs(
  user_id,version,goal,duration_weeks,sessions_per_week,start_date,end_date,
  status,generator_version,generated_at,history_through_date,
  muscle_volume_methodology_version,profile_revision,constraint_revision,
  training_days,requested_split,resolved_split,source_snapshot
)
values(
  '20420002-2222-4222-8222-222222222222',
  'training-program-v1','BALANCED',4,1,'2026-09-24','2026-10-21',
  'DRAFT','training-program-v1',now(),'2026-09-23',
  'muscle-volume-v2',1,0,array['THURSDAY'],'AUTO','FULL_BODY',
  '{}'::jsonb
);

set local role authenticated;
set local request.jwt.claim.sub='20420001-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*)::bigint from public.training_programs where user_id='20420002-2222-4222-8222-222222222222'$$,
  array[0::bigint],
  'RLS hides another users program rows'
);

select throws_ok(
  $$select public.create_my_training_program('{}'::jsonb)$$,
  '22023',
  'Training program source snapshot is required',
  'invalid program payload fails closed'
);

reset role;

insert into public.training_programs(
  id,user_id,version,goal,duration_weeks,sessions_per_week,start_date,end_date,
  status,generator_version,generated_at,history_through_date,
  muscle_volume_methodology_version,profile_revision,constraint_revision,
  training_days,requested_split,resolved_split,source_snapshot
)
values(
  '20429999-9999-4999-8999-999999999999',
  '20420001-1111-4111-8111-111111111111',
  'training-program-v1','BALANCED',4,1,'2026-09-24','2026-10-21',
  'DRAFT','training-program-v1',now(),'2026-09-23',
  'muscle-volume-v2',1,0,array['THURSDAY'],'AUTO','FULL_BODY',
  '{}'::jsonb
);

insert into public.training_program_workouts(
  id,program_id,week_index,session_index,scheduled_date,title
)
values(
  '20428888-8888-4888-8888-888888888888',
  '20429999-9999-4999-8999-999999999999',
  0,0,'2026-09-24','Full Body'
);

set local role authenticated;
set local request.jwt.claim.sub='20420001-1111-4111-8111-111111111111';

select lives_ok(
  $$select public.set_my_training_program_status('20429999-9999-4999-8999-999999999999','ACTIVE',1)$$,
  'owner may activate a draft program'
);

select is(
  (select status from public.training_programs where id='20429999-9999-4999-8999-999999999999'),
  'ACTIVE',
  'activation persists ACTIVE status'
);

select is(
  (select revision from public.training_programs where id='20429999-9999-4999-8999-999999999999'),
  2::bigint,
  'activation increments program revision'
);

select lives_ok(
  $$select public.mark_my_training_program_workout_missed('20428888-8888-4888-8888-888888888888')$$,
  'owner may explicitly mark an unlinked planned workout missed'
);

select is(
  (select execution_status from public.training_program_workouts where id='20428888-8888-4888-8888-888888888888'),
  'MISSED',
  'missed status persists separately from workout history'
);

select is(
  (select workout_session_id from public.training_program_workouts where id='20428888-8888-4888-8888-888888888888'),
  null::uuid,
  'missed planned workout has no fabricated workout session'
);

select throws_ok(
  $$select public.set_my_training_program_status('20429999-9999-4999-8999-999999999999','DRAFT',2)$$,
  '22023',
  'Training program status transition is invalid',
  'program lifecycle cannot move backward to draft'
);

select throws_ok(
  $$select public.set_my_training_program_status('20429999-9999-4999-8999-999999999999','ARCHIVED',1)$$,
  '40001',
  'Training program changed. Reload and try again.',
  'stale lifecycle revision fails closed'
);

select ok(
  (
    select execution_status='MISSED' and workout_session_id is null
    from public.training_program_workouts
    where id='20428888-8888-4888-8888-888888888888'
  ),
  'planned-versus-actual lineage remains explicit'
);

select * from finish();
rollback;
