-- Phase 15.3B advisor hardening: request/Storage authorization helpers belong
-- in a dedicated non-exposed schema, not as callable public Data API RPCs.

create schema if not exists api_hooks;
revoke all on schema api_hooks from public, anon, authenticated, service_role, authenticator;
grant usage on schema api_hooks to anon, authenticated, service_role, authenticator;

alter function public.is_current_account_session_active() set schema api_hooks;
alter function public.enforce_active_account_request() set schema api_hooks;

create or replace function api_hooks.enforce_active_account_request()
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_claims jsonb;
  v_claim_role text;
begin
  begin
    v_claims := coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb,
      '{}'::jsonb
    );
  exception
    when invalid_text_representation then
      v_claims := '{}'::jsonb;
  end;

  v_claim_role := coalesce(
    nullif(v_claims ->> 'role', ''),
    nullif(current_setting('request.jwt.claim.role', true), '')
  );

  if v_claim_role is distinct from 'authenticated' then
    return;
  end if;

  if not api_hooks.is_current_account_session_active() then
    raise exception 'Account or session is not active' using errcode = '42501';
  end if;
end;
$$;

revoke all on function api_hooks.is_current_account_session_active()
from public, anon, authenticated, service_role, authenticator;
revoke all on function api_hooks.enforce_active_account_request()
from public, anon, authenticated, service_role, authenticator;

grant execute on function api_hooks.is_current_account_session_active()
to authenticated, authenticator;
grant execute on function api_hooks.enforce_active_account_request()
to anon, authenticated, service_role, authenticator;

alter role authenticator set pgrst.db_pre_request = 'api_hooks.enforce_active_account_request';
notify pgrst, 'reload config';

comment on schema api_hooks is
  'Non-exposed request and policy authorization hooks. Never add this schema to the Data API exposed schemas.';
comment on function api_hooks.enforce_active_account_request() is
  'Security-invoker PostgREST hook. Authenticated claims delegate to the non-exposed active-account/session helper.';
comment on function api_hooks.is_current_account_session_active() is
  'Non-exposed Storage/RLS helper for ACTIVE account state plus JWT session_id validation against auth.sessions.';
