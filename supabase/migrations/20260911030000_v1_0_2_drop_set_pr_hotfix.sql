-- Top Set v1.0.2 — Drop Set PR recognition hotfix
--
-- Purpose:
-- 1) Allow completed Drop Set parent mirrors to participate in the existing
--    weighted Epley PR candidate selection.
-- 2) Keep Drop Sets excluded from Working-set qualification / completion-count
--    semantics. Only PR candidate selection changes.
-- 3) Align selective analytics session participation so tracked exercises with
--    Drop-only sessions are not silently omitted.
-- 4) Reconcile the chronological suffix for users with historical completed
--    Drop Sets so missed PRs / progression-derived state are repaired.
--
-- This migration intentionally patches the current authoritative function
-- definitions in-place with guarded, narrow replacements rather than copying
-- hundreds of lines of reconciler logic into a divergent fork.

do $hotfix$
declare
  v_def text;
  v_new text;
  v_pattern text;
  v_replacement text;
  v_user record;
begin
  ---------------------------------------------------------------------------
  -- Full authoritative reconciler:
  -- weighted PR candidates were WORKING-only. Include DROP parent mirrors.
  ---------------------------------------------------------------------------
  select pg_get_functiondef(
    'public.reconcile_lifting_v1_scoring_for_user(uuid)'::regprocedure
  )
  into v_def;

  v_pattern :=
    'and e\.measurement_type = ''WEIGHT_REPS''[[:space:]]+' ||
    'and ws\.set_type = ''WORKING''[[:space:]]+' ||
    'and ws\.completed[[:space:]]+' ||
    'and ws\.weight_kg > 0[[:space:]]+' ||
    'and ws\.reps between 1 and 12';

  v_replacement := $replacement$
and e.measurement_type = 'WEIGHT_REPS'
      and ws.set_type in ('WORKING', 'DROP')
      and ws.completed
      and ws.weight_kg > 0
      and ws.reps between 1 and 12
$replacement$;

  if v_def ~ v_pattern then
    v_new := regexp_replace(v_def, v_pattern, v_replacement);
    if v_new ~ v_pattern then
      raise exception
        'v1.0.2 hotfix expected exactly one weighted PR candidate predicate in public reconciler';
    end if;
    execute v_new;
  elsif position(
    'ws.set_type in (''WORKING'', ''DROP'')'
    in v_def
  ) = 0 then
    raise exception
      'v1.0.2 hotfix could not locate the weighted PR predicate in public reconciler';
  end if;

  ---------------------------------------------------------------------------
  -- Phase 17 suffix reconciler:
  -- must use the same PR candidate semantics as the full repair path.
  ---------------------------------------------------------------------------
  select pg_get_functiondef(
    'private.reconcile_lifting_v1_scoring_from_date(uuid,date)'::regprocedure
  )
  into v_def;

  if v_def ~ v_pattern then
    v_new := regexp_replace(v_def, v_pattern, v_replacement);
    if v_new ~ v_pattern then
      raise exception
        'v1.0.2 hotfix expected exactly one weighted PR candidate predicate in suffix reconciler';
    end if;
    execute v_new;
  elsif position(
    'ws.set_type in (''WORKING'', ''DROP'')'
    in v_def
  ) = 0 then
    raise exception
      'v1.0.2 hotfix could not locate the weighted PR predicate in suffix reconciler';
  end if;

  ---------------------------------------------------------------------------
  -- Selective analytics overview:
  -- tracked exercises should count completed Drop-only sessions as sessions.
  -- This does NOT make Drop Sets count as completed Working sets.
  ---------------------------------------------------------------------------
  select pg_get_functiondef(
    'public.get_my_exercise_progress_overview()'::regprocedure
  )
  into v_def;

  v_pattern :=
    'and w\.category = ''STRENGTH''[[:space:]]+' ||
    'and ws\.set_type = ''WORKING''[[:space:]]+' ||
    'and ws\.completed[[:space:]]+' ||
    'and coalesce\(ws\.reps, 0\) >= 1';

  v_replacement := $replacement$
and w.category = 'STRENGTH'
      and ws.set_type in ('WORKING', 'DROP')
      and ws.completed
      and coalesce(ws.reps, 0) >= 1
$replacement$;

  if v_def ~ v_pattern then
    v_new := regexp_replace(v_def, v_pattern, v_replacement);
    if v_new ~ v_pattern then
      raise exception
        'v1.0.2 hotfix expected exactly one session participation predicate in exercise overview';
    end if;
    execute v_new;
  elsif position(
    'ws.set_type in (''WORKING'', ''DROP'')'
    in v_def
  ) = 0 then
    raise exception
      'v1.0.2 hotfix could not locate the session participation predicate in exercise overview';
  end if;

  ---------------------------------------------------------------------------
  -- Repair historical derived state.
  --
  -- Rebuild only from each affected user's earliest completed Drop Set date.
  -- This preserves the unaffected chronological prefix while allowing missed
  -- Drop-stage PRs (and their existing progression semantics) to be restored.
  ---------------------------------------------------------------------------
  for v_user in
    select
      w.user_id,
      min(w.scoring_date) as from_date
    from public.workout_sessions w
    join public.workout_exercises we
      on we.workout_id = w.id
    join public.workout_sets ws
      on ws.workout_exercise_id = we.id
    where w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and ws.set_type = 'DROP'
      and ws.completed
    group by w.user_id
  loop
    perform private.reconcile_lifting_v1_scoring_from_date(
      v_user.user_id,
      v_user.from_date
    );
  end loop;
end
$hotfix$;

notify pgrst, 'reload schema';
