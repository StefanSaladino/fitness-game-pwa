-- Phase 18.2: Superset foundation.
-- Supersets are structural metadata on workout_exercises. They do not alter
-- exercise identity, sets, scoring, progress, or workout lifecycle semantics.

alter table public.workout_exercises
  add column if not exists superset_group_id uuid,
  add column if not exists superset_order integer;

alter table public.workout_exercises
  drop constraint if exists workout_exercises_superset_membership_pair,
  add constraint workout_exercises_superset_membership_pair
    check (
      (superset_group_id is null and superset_order is null)
      or
      (superset_group_id is not null and superset_order is not null)
    );

alter table public.workout_exercises
  drop constraint if exists workout_exercises_superset_order_nonnegative,
  add constraint workout_exercises_superset_order_nonnegative
    check (superset_order is null or superset_order >= 0);

create unique index if not exists workout_exercises_superset_member_order_unique
  on public.workout_exercises (workout_id, superset_group_id, superset_order)
  where superset_group_id is not null;

comment on column public.workout_exercises.superset_group_id
  is 'Nullable opaque identifier linking two or more workout exercises into one Superset within a workout.';

comment on column public.workout_exercises.superset_order
  is 'Zero-based exercise position inside a Superset. Null when the exercise is not in a Superset.';
