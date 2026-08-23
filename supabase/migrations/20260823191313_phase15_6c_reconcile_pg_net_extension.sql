lock table net.http_request_queue in access exclusive mode;

do $$
begin
  if exists (select 1 from net.http_request_queue) then
    raise exception using errcode = '55000', message = 'pg_net request queue must be empty before extension reconciliation';
  end if;
end;
$$;

drop extension pg_net;
create extension pg_net with schema extensions;

do $$
declare
  v_extension_schema text;
begin
  select n.nspname
  into v_extension_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_net';

  if v_extension_schema is distinct from 'extensions' then
    raise exception using errcode = '55000', message = format('pg_net extension schema reconciliation failed: %s', coalesce(v_extension_schema, '<missing>'));
  end if;

  if has_schema_privilege('anon', 'private', 'USAGE')
     or has_schema_privilege('authenticated', 'private', 'USAGE')
     or has_function_privilege('anon', 'private.dispatch_push_delivery(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.dispatch_push_delivery(uuid)', 'EXECUTE') then
    raise exception using errcode = '55000', message = 'private push dispatcher browser-role boundary changed during pg_net reconciliation';
  end if;

  if not exists (
    select 1 from cron.job
    where jobname = 'fitness-push-delivery'
      and active
      and command = 'select private.dispatch_pending_push_deliveries();'
  ) then
    raise exception using errcode = '55000', message = 'push delivery cron contract changed during pg_net reconciliation';
  end if;
end;
$$;
