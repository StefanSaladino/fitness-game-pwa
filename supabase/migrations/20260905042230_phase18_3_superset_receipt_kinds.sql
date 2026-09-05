-- Phase 18.3 follow-up: allow Superset mutation kinds in the durable receipt ledger.
-- The mutation RPC writes its idempotency receipt before applying the protected
-- operation, so the receipt constraint must recognize every supported kind.

alter table public.workout_mutation_receipts
  drop constraint if exists workout_mutation_receipts_kind_check;

alter table public.workout_mutation_receipts
  add constraint workout_mutation_receipts_kind_check check (
    mutation_kind in (
      'ADD_EXERCISE',
      'REMOVE_EXERCISE',
      'MOVE_EXERCISE',
      'ADD_SET',
      'COPY_SET',
      'SAVE_SET',
      'REMOVE_SET',
      'SET_SUPERSET',
      'CLEAR_SUPERSET'
    )
  );
