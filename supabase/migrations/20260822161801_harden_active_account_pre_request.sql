-- Phase 15.3B advisor hardening: keep the anonymous-callable PostgREST hook
-- security-invoker. Only authenticated claims delegate to the bounded
-- security-definer session helper, which returns a boolean and exposes no data.

create or replace function public.enforce_active_account_request()
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

  if not public.is_current_account_session_active() then
    raise exception 'Account or session is not active' using errcode = '42501';
  end if;
end;
$$;

grant execute on function public.is_current_account_session_active() to authenticator;

comment on function public.enforce_active_account_request() is
  'Security-invoker PostgREST hook. Authenticated claims delegate to the bounded active-account/session helper; anonymous and service claims retain existing boundaries.';
