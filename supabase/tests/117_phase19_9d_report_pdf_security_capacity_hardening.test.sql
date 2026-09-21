begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select has_schema(
  'report_private',
  'report_private schema exists'
);

select has_function(
  'report_private',
  'promote_my_monthly_training_report_pdf',
  array['uuid','text','bigint','text','text'],
  'private monthly PDF promotion helper exists'
);

select has_function(
  'report_private',
  'confirm_my_monthly_training_report_pdf_cleanup',
  array['text'],
  'private monthly PDF cleanup helper exists'
);

select ok(
  not (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.oid='public.promote_my_monthly_training_report_pdf(uuid,text,bigint,text,text)'::regprocedure
  ),
  'public PDF promotion wrapper is SECURITY INVOKER'
);

select ok(
  not (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.oid='public.confirm_my_monthly_training_report_pdf_cleanup(text)'::regprocedure
  ),
  'public PDF cleanup wrapper is SECURITY INVOKER'
);

select ok(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='report_private'
      and p.oid='report_private.promote_my_monthly_training_report_pdf(uuid,text,bigint,text,text)'::regprocedure
  ),
  'private PDF promotion helper is SECURITY DEFINER'
);

select ok(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='report_private'
      and p.oid='report_private.confirm_my_monthly_training_report_pdf_cleanup(text)'::regprocedure
  ),
  'private PDF cleanup helper is SECURITY DEFINER'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.promote_my_monthly_training_report_pdf(uuid,text,bigint,text,text)',
    'execute'
  ),
  true,
  'authenticated can execute public PDF promotion wrapper'
);

select is(
  has_function_privilege(
    'anon',
    'public.promote_my_monthly_training_report_pdf(uuid,text,bigint,text,text)',
    'execute'
  ),
  false,
  'anon cannot execute public PDF promotion wrapper'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.confirm_my_monthly_training_report_pdf_cleanup(text)',
    'execute'
  ),
  true,
  'authenticated can execute public PDF cleanup wrapper'
);

select is(
  has_function_privilege(
    'anon',
    'public.confirm_my_monthly_training_report_pdf_cleanup(text)',
    'execute'
  ),
  false,
  'anon cannot execute public PDF cleanup wrapper'
);

select is(
  has_schema_privilege('authenticated','report_private','usage'),
  true,
  'authenticated has bounded usage on report_private for public wrappers'
);

select ok(
  to_regclass(
    'public.monthly_training_report_source_snapshots_user_period_idx'
  ) is null,
  'redundant source user-period index is removed'
);

select ok(
  to_regclass(
    'public.monthly_training_report_source_snapshots_user_month_key'
  ) is not null,
  'unique source user-month index remains available for report lookup'
);

select * from finish();
rollback;
