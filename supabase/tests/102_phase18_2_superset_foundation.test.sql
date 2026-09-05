begin;

select plan(10);

select has_column(
  'public',
  'workout_exercises',
  'superset_group_id',
  'workout exercises expose nullable Superset group identity'
);

select has_column(
  'public',
  'workout_exercises',
  'superset_order',
  'workout exercises expose nullable Superset member order'
);

select col_is_null(
  'public',
  'workout_exercises',
  'superset_group_id',
  'Superset group identity is optional for ordinary workout exercises'
);

select col_is_null(
  'public',
  'workout_exercises',
  'superset_order',
  'Superset order is optional for ordinary workout exercises'
);

select col_type_is(
  'public',
  'workout_exercises',
  'superset_group_id',
  'uuid',
  'Superset group identity uses UUIDs'
);

select col_type_is(
  'public',
  'workout_exercises',
  'superset_order',
  'integer',
  'Superset order uses integer positions'
);

select col_has_check(
  'public',
  'workout_exercises',
  array['superset_group_id', 'superset_order']::name[],
  'Superset group and order must be defined together'
);

select col_has_check(
  'public',
  'workout_exercises',
  'superset_order',
  'Superset order is protected by a check constraint'
);

select has_index(
  'public',
  'workout_exercises',
  'workout_exercises_superset_member_order_unique',
  'Superset member order index exists'
);

select index_is_unique(
  'public',
  'workout_exercises',
  'workout_exercises_superset_member_order_unique',
  'Superset member order is unique inside each workout group'
);

rollback;
