begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select has_extension('pg_net','pg_net remains installed after reconciliation');
select is(
  (select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pg_net'),
  'extensions'::name,
  'pg_net extension is registered outside public'
);
select has_schema('net','pg_net runtime schema remains available');
select has_function('net','http_post',array['text','jsonb','jsonb','jsonb','integer'],'pg_net HTTP POST API remains available');
select has_function('private','dispatch_push_delivery',array['uuid'],'private push dispatcher remains available');
select is((select prosecdef from pg_proc where oid='private.dispatch_push_delivery(uuid)'::regprocedure),true,'private push dispatcher remains security definer');
select is((select proconfig = array['search_path=""'] from pg_proc where oid='private.dispatch_push_delivery(uuid)'::regprocedure),true,'private push dispatcher pins an empty search path');
select is(has_schema_privilege('anon','private','USAGE'),false,'anonymous browser role cannot use private schema');
select is(has_schema_privilege('authenticated','private','USAGE'),false,'authenticated browser role cannot use private schema');
select is(has_function_privilege('anon','private.dispatch_push_delivery(uuid)','EXECUTE'),false,'anonymous browser role cannot execute private push dispatcher');
select is(has_function_privilege('authenticated','private.dispatch_push_delivery(uuid)','EXECUTE'),false,'authenticated browser role cannot execute private push dispatcher');
select is(has_table_privilege('anon','private.push_runtime_config','SELECT'),false,'anonymous browser role cannot read push runtime configuration');
select results_eq(
  $$select count(*) from cron.job where jobname='fitness-push-delivery' and active and command='select private.dispatch_pending_push_deliveries();'$$,
  array[1::bigint],
  'hosted push retry cron remains active and exact'
);
select lives_ok(
  $$select private.dispatch_push_delivery('156cffff-0000-4000-8000-00000000fffe'::uuid)$$,
  'private dispatcher can still invoke recreated pg_net API'
);

select * from finish();
rollback;
