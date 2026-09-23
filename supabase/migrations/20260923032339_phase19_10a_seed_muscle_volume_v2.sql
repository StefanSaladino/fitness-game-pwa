-- Phase 19.10A: seed muscle-volume-v2 granularity without activating it.
-- BACK and SHOULDERS remain exercise-catalog browsing categories. They are
-- retained as volume keys only for legacy muscle-volume-v1 historical data.

alter table public.muscle_volume_benchmarks
  drop constraint muscle_volume_benchmarks_group;

alter table public.muscle_volume_benchmarks
  add constraint muscle_volume_benchmarks_group
  check (muscle_group = any (array['CHEST', 'BACK', 'SHOULDERS', 'LATS', 'UPPER_BACK', 'TRAPS', 'SPINAL_ERECTORS', 'ANTERIOR_DELTS', 'LATERAL_DELTS', 'POSTERIOR_DELTS', 'BICEPS', 'TRICEPS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE', 'OBLIQUES', 'FOREARMS_GRIP', 'NECK']::text[]));

alter table public.muscle_volume_exercise_contributions
  drop constraint muscle_volume_contributions_group;

alter table public.muscle_volume_exercise_contributions
  add constraint muscle_volume_contributions_group
  check (muscle_group = any (array['CHEST', 'BACK', 'SHOULDERS', 'LATS', 'UPPER_BACK', 'TRAPS', 'SPINAL_ERECTORS', 'ANTERIOR_DELTS', 'LATERAL_DELTS', 'POSTERIOR_DELTS', 'BICEPS', 'TRICEPS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE', 'OBLIQUES', 'FOREARMS_GRIP', 'NECK']::text[]));

insert into public.muscle_volume_methodologies (
  version,is_active,weighted_baseline_formula,bodyweight_baseline_formula,
  baseline_window_days,baseline_established_min_sessions,
  high_confidence_min_sessions,high_confidence_recent_days,
  epley_confidence_downgrade_from_reps,epley_max_reps,
  full_credit_min_ratio,partial_credit_min_ratio,single_rep_credit_cap,
  over_max_reps_credit_cap,failure_full_credit_min_reps,
  provisional_full_credit_min_reps,provisional_full_credit_max_reps,
  drop_continuation_credit,drop_max_multiplier,drop_min_continuation_reps,
  drop_requires_lower_load,drop_requires_contiguous_segments,
  pyramid_stages_independent,superset_multiplier,
  low_status_fraction_of_target_min,activated_at,created_at,notes
)
select
  'muscle-volume-v2',false,weighted_baseline_formula,
  bodyweight_baseline_formula,baseline_window_days,
  baseline_established_min_sessions,high_confidence_min_sessions,
  high_confidence_recent_days,epley_confidence_downgrade_from_reps,
  epley_max_reps,full_credit_min_ratio,partial_credit_min_ratio,
  single_rep_credit_cap,over_max_reps_credit_cap,
  failure_full_credit_min_reps,provisional_full_credit_min_reps,
  provisional_full_credit_max_reps,drop_continuation_credit,
  drop_max_multiplier,drop_min_continuation_reps,drop_requires_lower_load,
  drop_requires_contiguous_segments,pyramid_stages_independent,
  superset_multiplier,low_status_fraction_of_target_min,null,
  pg_catalog.now(),
  'Phase 19.10 muscle-volume-v2. Preserves v1 set-quality math while replacing broad BACK/SHOULDERS volume targets with granular back and deltoid subdivisions. Picker taxonomy remains unchanged. Subdivision benchmark bands are evidence-informed Top Set calibration and carry conservative evidence-confidence labels.'
from public.muscle_volume_methodologies
where version='muscle-volume-v1';

insert into public.muscle_volume_exercise_rules (
  methodology_version,exercise_id,volume_eligible,set_quality_mode,
  mapping_confidence,review_flag,rationale,created_at
)
select
  'muscle-volume-v2',exercise_id,volume_eligible,set_quality_mode,
  mapping_confidence,review_flag,rationale,pg_catalog.now()
from public.muscle_volume_exercise_rules
where methodology_version='muscle-volume-v1';

insert into public.muscle_volume_exercise_contributions (
  methodology_version,exercise_id,muscle_group,contribution_role,
  contribution_weight,created_at
)
select
  'muscle-volume-v2',exercise_id,muscle_group,contribution_role,
  contribution_weight,pg_catalog.now()
from public.muscle_volume_exercise_contributions
where methodology_version='muscle-volume-v1'
  and muscle_group not in ('BACK','SHOULDERS');

with remap(
  canonical_name,source_group,target_group,target_role,target_weight
) as (
  values
('45-Degree Back Extension', 'BACK', 'SPINAL_ERECTORS', 'DIRECT', 1.00),
('Back Extension', 'BACK', 'SPINAL_ERECTORS', 'DIRECT', 1.00),
('Rack Pull', 'BACK', 'SPINAL_ERECTORS', 'DIRECT', 1.00),
('45-Degree Hip Extension', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Axle Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Barbell B-Stance Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Cable Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Deficit Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Double Kettlebell Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Double Kettlebell Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Dumbbell Kickstand Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Dumbbell Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Dumbbell Single-Leg Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Dumbbell Stiff-Leg Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('GHD Hip Extension', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Good Morning', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Jefferson Curl', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Kettlebell Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Kettlebell Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Kettlebell Single-Leg Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Kettlebell Suitcase Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Kettlebell Sumo Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Landmine Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Landmine Single-Leg Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Machine Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Reverse Hyperextension', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Single-Leg 45-Degree Hip Extension', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Smith Machine Good Morning', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Smith Machine Romanian Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Snatch-Grip Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Stiff-Leg Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Sumo Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Trap Bar Deadlift', 'BACK', 'SPINAL_ERECTORS', 'INDIRECT', 0.50),
('Barbell Shrug', 'BACK', 'TRAPS', 'DIRECT', 1.00),
('Cable Shrug', 'BACK', 'TRAPS', 'DIRECT', 1.00),
('Dumbbell Shrug', 'BACK', 'TRAPS', 'DIRECT', 1.00),
('Kettlebell Shrug', 'BACK', 'TRAPS', 'DIRECT', 1.00),
('Machine Shrug', 'BACK', 'TRAPS', 'DIRECT', 1.00),
('Trap Bar Shrug', 'BACK', 'TRAPS', 'DIRECT', 1.00),
('Barbell Upright Row', 'BACK', 'TRAPS', 'INDIRECT', 0.50),
('Cable Upright Row', 'BACK', 'TRAPS', 'INDIRECT', 0.50),
('Dumbbell Upright Row', 'BACK', 'TRAPS', 'INDIRECT', 0.50),
('Dumbbell Y-Raise', 'BACK', 'TRAPS', 'INDIRECT', 0.50),
('Rack Pull', 'BACK', 'TRAPS', 'INDIRECT', 0.50),
('Barbell Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Cable High Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Cable Rear Delt Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Chest-Supported Barbell Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Chest-Supported Dumbbell Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Double Kettlebell Bent-Over Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Dumbbell High Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Dumbbell Rear Delt Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Inverted Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Kettlebell Bent-Over Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Kettlebell Chest-Supported Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Landmine High Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Machine Chest-Supported Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Machine High Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Machine Rear Delt Fly', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Machine Seated Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Machine T-Bar Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Pendlay Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Reverse Pec Deck Fly', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Ring Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Seal Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Seated Cable Row', 'BACK', 'UPPER_BACK', 'DIRECT', 1.00),
('Cable Face Pull', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Cable Low Row', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Cable Reverse Fly', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Dumbbell Gorilla Row', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Dumbbell Renegade Row', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Dumbbell Reverse Fly', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Dumbbell Row', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Kettlebell Gorilla Row', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Kettlebell Renegade Row', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Landmine Row', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Machine Low Row', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Meadows Row', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Single-Arm Cable Row', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Single-Arm Machine Row', 'BACK', 'UPPER_BACK', 'INDIRECT', 0.50),
('Archer Pull-Up', 'BACK', 'LATS', 'DIRECT', 1.00),
('Cable Low Row', 'BACK', 'LATS', 'DIRECT', 1.00),
('Cable Pullover', 'BACK', 'LATS', 'DIRECT', 1.00),
('Chin-Up', 'BACK', 'LATS', 'DIRECT', 1.00),
('Close-Grip Lat Pulldown', 'BACK', 'LATS', 'DIRECT', 1.00),
('Commando Pull-Up', 'BACK', 'LATS', 'DIRECT', 1.00),
('Dumbbell Gorilla Row', 'BACK', 'LATS', 'DIRECT', 1.00),
('Dumbbell Pullover', 'BACK', 'LATS', 'DIRECT', 1.00),
('Dumbbell Renegade Row', 'BACK', 'LATS', 'DIRECT', 1.00),
('Dumbbell Row', 'BACK', 'LATS', 'DIRECT', 1.00),
('Kettlebell Gorilla Row', 'BACK', 'LATS', 'DIRECT', 1.00),
('Kettlebell Renegade Row', 'BACK', 'LATS', 'DIRECT', 1.00),
('Landmine Row', 'BACK', 'LATS', 'DIRECT', 1.00),
('Lat Pulldown', 'BACK', 'LATS', 'DIRECT', 1.00),
('Machine Low Row', 'BACK', 'LATS', 'DIRECT', 1.00),
('Machine Pullover', 'BACK', 'LATS', 'DIRECT', 1.00),
('Meadows Row', 'BACK', 'LATS', 'DIRECT', 1.00),
('Neutral-Grip Lat Pulldown', 'BACK', 'LATS', 'DIRECT', 1.00),
('Neutral-Grip Pull-Up', 'BACK', 'LATS', 'DIRECT', 1.00),
('Pull-Up', 'BACK', 'LATS', 'DIRECT', 1.00),
('Rope Climb', 'BACK', 'LATS', 'DIRECT', 1.00),
('Single-Arm Cable Row', 'BACK', 'LATS', 'DIRECT', 1.00),
('Single-Arm Lat Pulldown', 'BACK', 'LATS', 'DIRECT', 1.00),
('Single-Arm Machine Row', 'BACK', 'LATS', 'DIRECT', 1.00),
('Sternum Pull-Up', 'BACK', 'LATS', 'DIRECT', 1.00),
('Straight-Arm Pulldown', 'BACK', 'LATS', 'DIRECT', 1.00),
('Wide-Grip Lat Pulldown', 'BACK', 'LATS', 'DIRECT', 1.00),
('Wide-Grip Pull-Up', 'BACK', 'LATS', 'DIRECT', 1.00),
('Barbell Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Cable High Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Chest-Supported Barbell Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Chest-Supported Dumbbell Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Double Kettlebell Bent-Over Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Dumbbell High Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Inverted Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Kettlebell Bent-Over Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Kettlebell Chest-Supported Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Landmine High Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Machine Chest-Supported Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Machine High Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Machine Seated Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Machine T-Bar Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Pendlay Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Ring Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Seal Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Seated Cable Row', 'BACK', 'LATS', 'INDIRECT', 0.50),
('Archer Push-Up', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Barbell Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Barbell Floor Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Bench Dip', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Board Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Cable Chest Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Close-Grip Barbell Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Decline Barbell Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Decline Dumbbell Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Decline Machine Chest Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Decline Push-Up', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Diamond Push-Up', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Dip', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Dumbbell Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Dumbbell Close-Grip Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Dumbbell Floor Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Dumbbell Squeeze Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Hindu Push-Up', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Incline Barbell Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Incline Dumbbell Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Incline Dumbbell Squeeze Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Incline Machine Chest Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Incline Push-Up', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('JM Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Kettlebell Floor Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Kettlebell Windmill', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Larsen Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Machine Chest Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Machine Dip', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Neutral-Grip Dumbbell Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('One-Arm Push-Up', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Paused Barbell Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Pin Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Push-Up', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Reverse-Grip Barbell Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Ring Dip', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Ring Push-Up', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Single-Arm Cable Chest Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Single-Arm Dumbbell Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Single-Arm Incline Dumbbell Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Single-Arm Machine Chest Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Smith Machine Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Smith Machine Close-Grip Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Smith Machine Decline Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Smith Machine Floor Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Smith Machine Incline Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Spoto Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Swiss Bar Bench Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Wide-Grip Push-Up', 'SHOULDERS', 'ANTERIOR_DELTS', 'INDIRECT', 0.50),
('Arnold Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Barbell Front Raise', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Bradford Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Cable Front Raise', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Double Kettlebell Strict Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Dumbbell Front Raise', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Dumbbell Shoulder Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Half-Kneeling Landmine Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Handstand Push-Up', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Kettlebell Bottoms-Up Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Kettlebell Front Raise', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Kettlebell Strict Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Landmine Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Machine Shoulder Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Overhead Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Pike Push-Up', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Pseudo Planche Push-Up', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Single-Arm Dumbbell Shoulder Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Single-Arm Landmine Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Single-Arm Machine Shoulder Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Smith Machine Behind-the-Neck Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Smith Machine Shoulder Press', 'SHOULDERS', 'ANTERIOR_DELTS', 'DIRECT', 1.00),
('Barbell Upright Row', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Cable Lateral Raise', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Cable Upright Row', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Cable Y-Raise', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Dumbbell Lateral Raise', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Dumbbell Scaption Raise', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Dumbbell Upright Row', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Dumbbell Y-Raise', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Egyptian Cable Lateral Raise', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Incline Dumbbell Lateral Raise', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Kettlebell Lateral Raise', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Lean-Away Dumbbell Lateral Raise', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Machine Lateral Raise', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Seated Dumbbell Lateral Raise', 'SHOULDERS', 'LATERAL_DELTS', 'DIRECT', 1.00),
('Arnold Press', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Bradford Press', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Double Kettlebell Strict Press', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Dumbbell Shoulder Press', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Handstand Push-Up', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Kettlebell Bottoms-Up Press', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Kettlebell Strict Press', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Machine Shoulder Press', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Overhead Press', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Pike Push-Up', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Single-Arm Dumbbell Shoulder Press', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Single-Arm Machine Shoulder Press', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Smith Machine Behind-the-Neck Press', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Smith Machine Shoulder Press', 'SHOULDERS', 'LATERAL_DELTS', 'INDIRECT', 0.50),
('Cable Face Pull', 'SHOULDERS', 'POSTERIOR_DELTS', 'DIRECT', 1.00),
('Cable Rear Delt Row', 'SHOULDERS', 'POSTERIOR_DELTS', 'DIRECT', 1.00),
('Cable Reverse Fly', 'SHOULDERS', 'POSTERIOR_DELTS', 'DIRECT', 1.00),
('Dumbbell High Row', 'SHOULDERS', 'POSTERIOR_DELTS', 'DIRECT', 1.00),
('Dumbbell Rear Delt Row', 'SHOULDERS', 'POSTERIOR_DELTS', 'DIRECT', 1.00),
('Dumbbell Reverse Fly', 'SHOULDERS', 'POSTERIOR_DELTS', 'DIRECT', 1.00),
('Landmine High Row', 'SHOULDERS', 'POSTERIOR_DELTS', 'DIRECT', 1.00),
('Machine Rear Delt Fly', 'SHOULDERS', 'POSTERIOR_DELTS', 'DIRECT', 1.00),
('Reverse Pec Deck Fly', 'SHOULDERS', 'POSTERIOR_DELTS', 'DIRECT', 1.00)
)
insert into public.muscle_volume_exercise_contributions (
  methodology_version,exercise_id,muscle_group,contribution_role,
  contribution_weight,created_at
)
select distinct
  'muscle-volume-v2',ec.id,r.target_group,r.target_role,r.target_weight,
  pg_catalog.now()
from remap r
join public.exercise_catalog ec
  on ec.canonical_name=r.canonical_name
join public.muscle_volume_exercise_contributions legacy
  on legacy.methodology_version='muscle-volume-v1'
 and legacy.exercise_id=ec.id
 and legacy.muscle_group=r.source_group;

insert into public.muscle_volume_benchmarks (
  methodology_version,muscle_group,window_days,target_min,target_midpoint,
  target_max,high_review_above,evidence_confidence,created_at
)
select
  'muscle-volume-v2',muscle_group,window_days,target_min,target_midpoint,
  target_max,high_review_above,evidence_confidence,pg_catalog.now()
from public.muscle_volume_benchmarks
where methodology_version='muscle-volume-v1'
  and muscle_group not in ('BACK','SHOULDERS');

with benchmark(
  muscle_group,window_days,target_min,target_midpoint,target_max,
  high_review_above,evidence_confidence
) as (
  values
('LATS', 7, 8.00, 11.00, 14.00, 18.00, 'MODERATE_LOW'),
('UPPER_BACK', 7, 8.00, 11.00, 14.00, 18.00, 'MODERATE_LOW'),
('TRAPS', 7, 4.00, 7.00, 10.00, 14.00, 'LOW_MODERATE'),
('SPINAL_ERECTORS', 7, 4.00, 6.00, 8.00, 12.00, 'LOW'),
('ANTERIOR_DELTS', 7, 4.00, 6.00, 8.00, 12.00, 'LOW_MODERATE'),
('LATERAL_DELTS', 7, 6.00, 9.00, 12.00, 16.00, 'MODERATE_LOW'),
('POSTERIOR_DELTS', 7, 6.00, 9.00, 12.00, 16.00, 'LOW_MODERATE'),
('LATS', 28, 32.00, 44.00, 56.00, 72.00, 'MODERATE_LOW'),
('UPPER_BACK', 28, 32.00, 44.00, 56.00, 72.00, 'MODERATE_LOW'),
('TRAPS', 28, 16.00, 28.00, 40.00, 56.00, 'LOW_MODERATE'),
('SPINAL_ERECTORS', 28, 16.00, 24.00, 32.00, 48.00, 'LOW'),
('ANTERIOR_DELTS', 28, 16.00, 24.00, 32.00, 48.00, 'LOW_MODERATE'),
('LATERAL_DELTS', 28, 24.00, 36.00, 48.00, 64.00, 'MODERATE_LOW'),
('POSTERIOR_DELTS', 28, 24.00, 36.00, 48.00, 64.00, 'LOW_MODERATE')
)
insert into public.muscle_volume_benchmarks (
  methodology_version,muscle_group,window_days,target_min,target_midpoint,
  target_max,high_review_above,evidence_confidence,created_at
)
select
  'muscle-volume-v2',muscle_group,window_days,target_min,target_midpoint,
  target_max,high_review_above,evidence_confidence,pg_catalog.now()
from benchmark;

do $$
declare
  v_missing_back integer;
  v_missing_shoulders integer;
  v_eligible_without_mapping integer;
begin
  select count(*) into v_missing_back
  from (
    select distinct exercise_id
    from public.muscle_volume_exercise_contributions
    where methodology_version='muscle-volume-v1'
      and muscle_group='BACK'
    except
    select distinct exercise_id
    from public.muscle_volume_exercise_contributions
    where methodology_version='muscle-volume-v2'
      and muscle_group in ('LATS','UPPER_BACK','TRAPS','SPINAL_ERECTORS')
  ) missing;

  select count(*) into v_missing_shoulders
  from (
    select distinct exercise_id
    from public.muscle_volume_exercise_contributions
    where methodology_version='muscle-volume-v1'
      and muscle_group='SHOULDERS'
    except
    select distinct exercise_id
    from public.muscle_volume_exercise_contributions
    where methodology_version='muscle-volume-v2'
      and muscle_group in (
        'ANTERIOR_DELTS','LATERAL_DELTS','POSTERIOR_DELTS'
      )
  ) missing;

  select count(*) into v_eligible_without_mapping
  from public.muscle_volume_exercise_rules r
  where r.methodology_version='muscle-volume-v2'
    and r.volume_eligible
    and not exists (
      select 1
      from public.muscle_volume_exercise_contributions c
      where c.methodology_version=r.methodology_version
        and c.exercise_id=r.exercise_id
    );

  if v_missing_back <> 0 then
    raise exception 'v2 missing % legacy BACK mappings', v_missing_back;
  end if;
  if v_missing_shoulders <> 0 then
    raise exception 'v2 missing % legacy SHOULDERS mappings',
      v_missing_shoulders;
  end if;
  if v_eligible_without_mapping <> 0 then
    raise exception 'v2 has % eligible exercises without mappings',
      v_eligible_without_mapping;
  end if;
  if (
    select count(*) from public.muscle_volume_exercise_rules
    where methodology_version='muscle-volume-v2'
  ) <> 568 then
    raise exception 'v2 expected 568 rules';
  end if;
  if (
    select count(*) from public.muscle_volume_exercise_rules
    where methodology_version='muscle-volume-v2'
      and volume_eligible
  ) <> 418 then
    raise exception 'v2 expected 418 eligible';
  end if;
  if exists (
    select 1 from public.muscle_volume_exercise_contributions
    where methodology_version='muscle-volume-v2'
      and muscle_group in ('BACK','SHOULDERS')
  ) then
    raise exception 'v2 contains broad BACK/SHOULDERS';
  end if;
  if (
    select count(*) from public.muscle_volume_benchmarks
    where methodology_version='muscle-volume-v2'
      and window_days=7
  ) <> 18 then
    raise exception 'v2 expected 18 seven-day benchmarks';
  end if;
  if (
    select count(*) from public.muscle_volume_benchmarks
    where methodology_version='muscle-volume-v2'
      and window_days=28
  ) <> 18 then
    raise exception 'v2 expected 18 twenty-eight-day benchmarks';
  end if;
end;
$$;
