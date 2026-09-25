-- Phase 20.6 hosted reconciliation: keep one unambiguous PostgREST substitution RPC signature.

drop function if exists public.replace_my_training_program_exercise(
  uuid,
  uuid,
  bigint,
  bigint
);

notify pgrst, 'reload schema';
