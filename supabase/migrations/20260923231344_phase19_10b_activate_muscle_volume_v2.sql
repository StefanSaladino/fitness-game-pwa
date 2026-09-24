-- Phase 19.10B: activate muscle-volume-v2 for development and future release.
-- The application remains undeployed; this changes the shared development
-- backend so the local client can exercise the granular methodology.

do $do$
declare
  v_def text;
  v_next text;
begin
  select pg_get_functiondef(p.oid)
  into v_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'get_my_training_program_candidate_catalog'
    and pg_get_function_identity_arguments(p.oid) = '';

  if v_def is null then
    raise exception 'Candidate catalogue RPC not found';
  end if;

  v_next := replace(
    v_def,
    'r.methodology_version = ''muscle-volume-v1''',
    'r.methodology_version = (select m.version from public.muscle_volume_methodologies m where m.is_active order by m.version limit 1)'
  );

  v_next := replace(
    v_next,
    'c.methodology_version = ''muscle-volume-v1''',
    'c.methodology_version = (select m.version from public.muscle_volume_methodologies m where m.is_active order by m.version limit 1)'
  );

  if v_next = v_def then
    raise exception 'Candidate catalogue RPC did not contain expected v1 pins';
  end if;

  execute v_next;
end;
$do$;

do $do$
declare
  v_def text;
  v_next text;
  v_old text := $old$
  ) <> 13 then
    raise exception 'Monthly report source snapshot expected 13 muscle rows'
      using errcode = '55000';
  end if;$old$;
  v_new text := $new$
  ) <> (
    select count(*)
    from public.muscle_volume_benchmarks b
    where b.methodology_version = v_summary.methodology_version
      and b.window_days = 28
  ) then
    raise exception 'Monthly report source snapshot muscle row count does not match methodology'
      using errcode = '55000';
  end if;$new$;
begin
  select pg_get_functiondef(p.oid)
  into v_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'report_private'
    and p.proname = 'freeze_my_monthly_training_report_source'
    and pg_get_function_identity_arguments(p.oid) = 'p_month_start date';

  if v_def is null then
    raise exception 'Monthly report freezer not found';
  end if;

  v_next := replace(v_def, v_old, v_new);

  if v_next = v_def then
    raise exception 'Monthly report freezer did not contain expected 13-row assertion';
  end if;

  execute v_next;
end;
$do$;

update public.muscle_volume_methodologies
set is_active = false
where is_active
  and version <> 'muscle-volume-v2';

update public.muscle_volume_methodologies
set is_active = true,
    activated_at = coalesce(activated_at, pg_catalog.now())
where version = 'muscle-volume-v2';

do $do$
begin
  if (
    select count(*)
    from public.muscle_volume_methodologies
    where is_active
  ) <> 1 then
    raise exception 'Exactly one muscle-volume methodology must be active';
  end if;

  if not exists (
    select 1
    from public.muscle_volume_methodologies
    where version = 'muscle-volume-v2'
      and is_active
  ) then
    raise exception 'muscle-volume-v2 activation failed';
  end if;

  if (
    select count(*)
    from public.muscle_volume_benchmarks
    where methodology_version = 'muscle-volume-v2'
      and window_days = 7
  ) <> 18 then
    raise exception 'v2 expected 18 seven-day benchmark groups';
  end if;

  if exists (
    select 1
    from public.muscle_volume_exercise_contributions
    where methodology_version = 'muscle-volume-v2'
      and muscle_group in ('BACK','SHOULDERS')
  ) then
    raise exception 'v2 still contains broad BACK/SHOULDERS contribution targets';
  end if;
end;
$do$;

notify pgrst, 'reload schema';
