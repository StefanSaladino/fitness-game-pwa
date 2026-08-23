-- Phase 15.5 closes the legacy function-privilege gap before the
-- administration feature set is treated as an integrated boundary.
--
-- Supabase projects historically grant new public functions to the browser
-- roles through default privileges. Every browser RPC in this project is
-- granted deliberately by its owning migration, so implicit browser access is
-- both unnecessary and unsafe.
alter default privileges for role postgres in schema public
revoke execute on functions from public, anon, authenticated;

-- Existing application RPCs already have explicit authenticated grants. Remove
-- every inherited anonymous/default grant in one schema-wide operation so a
-- forgotten legacy helper cannot be exposed through PostgREST.
revoke execute on all functions in schema public from public, anon;

-- Trigger functions are invoked by PostgreSQL, never by a browser role. Older
-- migrations predated the explicit-grant convention and left some of these
-- callable by authenticated users.
do $$
declare
  v_function regprocedure;
begin
  for v_function in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and pg_get_function_result(p.oid) = 'trigger'
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      v_function
    );
  end loop;
end;
$$;

comment on schema public is
  'Data API schema. Function execution is deny-by-default; browser RPC grants must be explicit and covered by pgTAP.';
