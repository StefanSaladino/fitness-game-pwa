-- Phase 19.0: expand common commercial-gym exercises without adding taxonomy categories.
-- Existing workout_type values are reused; Smith movements remain MACHINE in the current schema.

insert into public.exercise_catalog (canonical_name, measurement_type, primary_muscle_group, workout_type, aliases, active)
values
  ('Decline Machine Chest Press','WEIGHT_REPS','CHEST','MACHINE',array['Machine Decline Chest Press'],true),
  ('Single-Arm Machine Chest Press','WEIGHT_REPS','CHEST','MACHINE',array['Unilateral Machine Chest Press'],true),
  ('Machine Chest Fly','WEIGHT_REPS','CHEST','MACHINE',array['Chest Fly Machine','Machine Pec Fly'],true),
  ('Smith Machine Decline Bench Press','WEIGHT_REPS','CHEST','MACHINE',array['Smith Decline Bench Press'],true),
  ('Smith Machine Floor Press','WEIGHT_REPS','CHEST','MACHINE',array['Smith Floor Press'],true),
  ('Machine Pullover','WEIGHT_REPS','BACK','MACHINE',array['Pullover Machine'],true),
  ('Machine Chest-Supported Row','WEIGHT_REPS','BACK','MACHINE',array['Chest Supported Row Machine'],true),
  ('Single-Arm Machine Row','WEIGHT_REPS','BACK','MACHINE',array['Unilateral Machine Row'],true),
  ('Machine T-Bar Row','WEIGHT_REPS','BACK','MACHINE',array['T-Bar Row Machine'],true),
  ('Wide-Grip Lat Pulldown','WEIGHT_REPS','BACK','MACHINE',array['Wide Grip Lat Pulldown'],true),
  ('Neutral-Grip Lat Pulldown','WEIGHT_REPS','BACK','MACHINE',array['Neutral Grip Lat Pulldown'],true),
  ('Single-Arm Lat Pulldown','WEIGHT_REPS','BACK','MACHINE',array['One Arm Lat Pulldown','Unilateral Lat Pulldown'],true),
  ('Machine Shrug','WEIGHT_REPS','BACK','MACHINE',array['Shrug Machine'],true),
  ('Machine Rear Delt Fly','WEIGHT_REPS','SHOULDERS','MACHINE',array['Rear Delt Machine','Rear Delt Fly Machine'],true),
  ('Single-Arm Machine Shoulder Press','WEIGHT_REPS','SHOULDERS','MACHINE',array['Unilateral Machine Shoulder Press'],true),
  ('Smith Machine Shoulder Press','WEIGHT_REPS','SHOULDERS','MACHINE',array['Smith Shoulder Press','Smith Overhead Press'],true),
  ('Smith Machine Behind-the-Neck Press','WEIGHT_REPS','SHOULDERS','MACHINE',array['Smith Behind the Neck Press'],true),
  ('Machine Dip','WEIGHT_REPS','TRICEPS','MACHINE',array['Seated Dip Machine','Triceps Dip Machine'],true),
  ('Machine Triceps Press','WEIGHT_REPS','TRICEPS','MACHINE',array['Triceps Press Machine'],true),
  ('Smith Machine Close-Grip Bench Press','WEIGHT_REPS','TRICEPS','MACHINE',array['Smith Close Grip Bench Press'],true),
  ('Machine Hammer Curl','WEIGHT_REPS','BICEPS','MACHINE',array['Hammer Curl Machine'],true),
  ('Machine Spider Curl','WEIGHT_REPS','BICEPS','MACHINE',array['Spider Curl Machine'],true),
  ('Single-Arm Machine Biceps Curl','WEIGHT_REPS','BICEPS','MACHINE',array['Unilateral Machine Biceps Curl'],true),
  ('V-Squat Machine','WEIGHT_REPS','QUADS','MACHINE',array['V Squat','V-Squat'],true),
  ('Horizontal Leg Press','WEIGHT_REPS','QUADS','MACHINE',array['Seated Leg Press'],true),
  ('Vertical Leg Press','WEIGHT_REPS','QUADS','MACHINE',array[]::text[],true),
  ('Machine Sissy Squat','WEIGHT_REPS','QUADS','MACHINE',array['Sissy Squat Machine'],true),
  ('Smith Machine Reverse Lunge','WEIGHT_REPS','QUADS','MACHINE',array['Smith Reverse Lunge'],true),
  ('Smith Machine Split Squat','WEIGHT_REPS','QUADS','MACHINE',array['Smith Split Squat'],true),
  ('Smith Machine Walking Lunge','WEIGHT_REPS','QUADS','MACHINE',array['Smith Walking Lunge'],true),
  ('Single-Leg Lying Leg Curl','WEIGHT_REPS','HAMSTRINGS','MACHINE',array['Single Leg Lying Leg Curl'],true),
  ('Single-Leg Seated Leg Curl','WEIGHT_REPS','HAMSTRINGS','MACHINE',array['Single Leg Seated Leg Curl'],true),
  ('Single-Leg Standing Leg Curl','WEIGHT_REPS','HAMSTRINGS','MACHINE',array['Single Leg Standing Leg Curl'],true),
  ('Machine Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','MACHINE',array['RDL Machine'],true),
  ('Smith Machine Good Morning','WEIGHT_REPS','HAMSTRINGS','MACHINE',array['Smith Good Morning'],true),
  ('Machine Hip Thrust','WEIGHT_REPS','GLUTES','MACHINE',array['Hip Thrust Machine'],true),
  ('Machine Glute Kickback','WEIGHT_REPS','GLUTES','MACHINE',array['Glute Kickback Machine','Glute Kickback'],true),
  ('Single-Leg Machine Glute Kickback','WEIGHT_REPS','GLUTES','MACHINE',array['Single Leg Glute Kickback Machine'],true),
  ('Smith Machine Glute Bridge','WEIGHT_REPS','GLUTES','MACHINE',array['Smith Glute Bridge'],true),
  ('Leg Press Calf Raise','WEIGHT_REPS','CALVES','MACHINE',array['Calf Press on Leg Press','Leg Press Calf Press'],true),
  ('Hack Squat Calf Raise','WEIGHT_REPS','CALVES','MACHINE',array['Calf Raise on Hack Squat'],true),
  ('Donkey Calf Raise Machine','WEIGHT_REPS','CALVES','MACHINE',array['Machine Donkey Calf Raise'],true),
  ('Single-Leg Calf Raise Machine','WEIGHT_REPS','CALVES','MACHINE',array['Single Leg Calf Raise Machine'],true),
  ('Ab Crunch Machine','WEIGHT_REPS','CORE','MACHINE',array['Machine Crunch','Abdominal Crunch Machine'],true),
  ('Rotary Torso Machine','WEIGHT_REPS','OBLIQUES','MACHINE',array['Torso Rotation Machine','Rotary Torso'],true),
  ('Wrist Curl Machine','WEIGHT_REPS','FOREARMS_GRIP','MACHINE',array['Machine Wrist Curl'],true),
  ('Reverse Wrist Curl Machine','WEIGHT_REPS','FOREARMS_GRIP','MACHINE',array['Machine Reverse Wrist Curl'],true),
  ('Grip Machine','WEIGHT_REPS','FOREARMS_GRIP','MACHINE',array['Gripper Machine','Grip Strength Machine'],true),
  ('Neck Flexion Machine','WEIGHT_REPS','NECK','MACHINE',array['Machine Neck Flexion'],true),
  ('Neck Extension Machine','WEIGHT_REPS','NECK','MACHINE',array['Machine Neck Extension'],true)
on conflict (canonical_name) do nothing;

-- Correct an existing obvious catalogue classification error while the catalogue is being expanded.
update public.exercise_catalog
set primary_muscle_group = 'GLUTES'
where canonical_name = 'Cable Glute Kickback'
  and primary_muscle_group = 'TRICEPS';
