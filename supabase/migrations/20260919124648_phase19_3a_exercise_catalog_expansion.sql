-- Phase 19.3A: Exercise Catalogue Expansion II.
-- Adds 58 useful dumbbell exercises without adding picker categories or equipment hierarchies.
-- The corresponding muscle-volume mapping decisions live in
-- supabase/release/phase19-3a-exercise-additions.json and are merged into the
-- existing Phase 19.3 matrix by update-phase19-3a-matrix.mjs.

do $$
begin
  if (select count(*) from public.exercise_catalog where active = true) <> 406 then
    raise exception 'Phase 19.3A expected 406 active catalogue rows before expansion';
  end if;

  if (select count(*) from public.exercise_catalog where active = true and workout_type = 'DUMBBELL') <> 35 then
    raise exception 'Phase 19.3A expected 35 active dumbbell catalogue rows before expansion';
  end if;

  if exists (
    select 1
    from public.exercise_catalog
    where canonical_name = any(array['Dumbbell Gorilla Row','Dumbbell High Row','Dumbbell Spider Curl','Dumbbell Zottman Curl','Dumbbell Reverse Curl','Dumbbell Cross-Body Hammer Curl','Dumbbell Drag Curl','Seated Dumbbell Curl','Neutral-Grip Dumbbell Bench Press','Single-Arm Dumbbell Bench Press','Single-Arm Incline Dumbbell Press','Incline Dumbbell Squeeze Press','Dumbbell Crunch','Dumbbell Sit-Up','Dumbbell Dead Bug','Dumbbell Side Bend','Dumbbell Russian Twist','Dumbbell Wood Chop','Dumbbell Wrist Curl','Dumbbell Reverse Wrist Curl','Dumbbell Pronation/Supination','Dumbbell Finger Curl','Dumbbell Hip Thrust','Dumbbell Glute Bridge','Dumbbell Frog Pump','Dumbbell Curtsy Lunge','Dumbbell Stiff-Leg Deadlift','Dumbbell Kickstand Romanian Deadlift','Dumbbell Leg Curl','Dumbbell Split Squat','Dumbbell Forward Lunge','Dumbbell Lateral Lunge','Dumbbell Cyclist Squat','Dumbbell Heels-Elevated Squat','Dumbbell Box Squat','Dumbbell Sumo Squat','Lean-Away Dumbbell Lateral Raise','Incline Dumbbell Lateral Raise','Seated Dumbbell Lateral Raise','Dumbbell Y-Raise','Dumbbell Scaption Raise','Dumbbell Upright Row','Dumbbell Rear Delt Row','Single-Arm Dumbbell Shoulder Press','Dumbbell Tate Press','Dumbbell Rolling Triceps Extension','Dumbbell Close-Grip Bench Press','Single-Arm Overhead Dumbbell Triceps Extension','Seated Dumbbell Calf Raise','Single-Leg Dumbbell Calf Raise','Dumbbell Clean','Dumbbell Clean and Press','Dumbbell Hang Clean','Dumbbell Power Clean','Dumbbell Snatch','Dumbbell Hang Snatch','Dumbbell Thruster','Dumbbell Devil Press']::text[])
  ) then
    raise exception 'Phase 19.3A canonical-name collision detected; stop and review instead of silently skipping';
  end if;
end
$$;

insert into public.exercise_catalog
  (canonical_name, measurement_type, primary_muscle_group, workout_type, aliases, active)
values
  ('Dumbbell Gorilla Row','WEIGHT_REPS','BACK','DUMBBELL',array['DB Gorilla Row','Gorilla Row']::text[],true),
  ('Dumbbell High Row','WEIGHT_REPS','BACK','DUMBBELL',array['DB High Row']::text[],true),
  ('Dumbbell Spider Curl','WEIGHT_REPS','BICEPS','DUMBBELL',array['DB Spider Curl']::text[],true),
  ('Dumbbell Zottman Curl','WEIGHT_REPS','BICEPS','DUMBBELL',array['DB Zottman Curl']::text[],true),
  ('Dumbbell Reverse Curl','WEIGHT_REPS','BICEPS','DUMBBELL',array['DB Reverse Curl']::text[],true),
  ('Dumbbell Cross-Body Hammer Curl','WEIGHT_REPS','BICEPS','DUMBBELL',array['DB Cross Body Hammer Curl','Cross-Body DB Hammer Curl']::text[],true),
  ('Dumbbell Drag Curl','WEIGHT_REPS','BICEPS','DUMBBELL',array['DB Drag Curl']::text[],true),
  ('Seated Dumbbell Curl','WEIGHT_REPS','BICEPS','DUMBBELL',array['Seated DB Curl']::text[],true),
  ('Neutral-Grip Dumbbell Bench Press','WEIGHT_REPS','CHEST','DUMBBELL',array['Neutral Grip DB Bench Press','Neutral-Grip DB Bench']::text[],true),
  ('Single-Arm Dumbbell Bench Press','WEIGHT_REPS','CHEST','DUMBBELL',array['One-Arm Dumbbell Bench Press','Single-Arm DB Bench Press']::text[],true),
  ('Single-Arm Incline Dumbbell Press','WEIGHT_REPS','CHEST','DUMBBELL',array['One-Arm Incline Dumbbell Press','Single-Arm Incline DB Press']::text[],true),
  ('Incline Dumbbell Squeeze Press','WEIGHT_REPS','CHEST','DUMBBELL',array['Incline DB Squeeze Press']::text[],true),
  ('Dumbbell Crunch','WEIGHT_REPS','CORE','DUMBBELL',array['DB Crunch','Weighted Dumbbell Crunch']::text[],true),
  ('Dumbbell Sit-Up','WEIGHT_REPS','CORE','DUMBBELL',array['DB Sit-Up','Dumbbell Sit Up']::text[],true),
  ('Dumbbell Dead Bug','WEIGHT_REPS','CORE','DUMBBELL',array['DB Dead Bug','Weighted Dead Bug']::text[],true),
  ('Dumbbell Side Bend','WEIGHT_REPS','OBLIQUES','DUMBBELL',array['DB Side Bend']::text[],true),
  ('Dumbbell Russian Twist','WEIGHT_REPS','OBLIQUES','DUMBBELL',array['DB Russian Twist']::text[],true),
  ('Dumbbell Wood Chop','WEIGHT_REPS','OBLIQUES','DUMBBELL',array['DB Wood Chop']::text[],true),
  ('Dumbbell Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','DUMBBELL',array['DB Wrist Curl']::text[],true),
  ('Dumbbell Reverse Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','DUMBBELL',array['DB Reverse Wrist Curl']::text[],true),
  ('Dumbbell Pronation/Supination','WEIGHT_REPS','FOREARMS_GRIP','DUMBBELL',array['DB Pronation Supination','Dumbbell Forearm Rotation']::text[],true),
  ('Dumbbell Finger Curl','WEIGHT_REPS','FOREARMS_GRIP','DUMBBELL',array['DB Finger Curl']::text[],true),
  ('Dumbbell Hip Thrust','WEIGHT_REPS','GLUTES','DUMBBELL',array['DB Hip Thrust']::text[],true),
  ('Dumbbell Glute Bridge','WEIGHT_REPS','GLUTES','DUMBBELL',array['DB Glute Bridge']::text[],true),
  ('Dumbbell Frog Pump','WEIGHT_REPS','GLUTES','DUMBBELL',array['DB Frog Pump']::text[],true),
  ('Dumbbell Curtsy Lunge','WEIGHT_REPS','GLUTES','DUMBBELL',array['DB Curtsy Lunge']::text[],true),
  ('Dumbbell Stiff-Leg Deadlift','WEIGHT_REPS','HAMSTRINGS','DUMBBELL',array['DB Stiff-Leg Deadlift','DB SLDL']::text[],true),
  ('Dumbbell Kickstand Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','DUMBBELL',array['DB Kickstand RDL','Dumbbell B-Stance Romanian Deadlift','B-Stance Dumbbell RDL']::text[],true),
  ('Dumbbell Leg Curl','WEIGHT_REPS','HAMSTRINGS','DUMBBELL',array['DB Leg Curl','Dumbbell Hamstring Curl']::text[],true),
  ('Dumbbell Split Squat','WEIGHT_REPS','QUADS','DUMBBELL',array['DB Split Squat']::text[],true),
  ('Dumbbell Forward Lunge','WEIGHT_REPS','QUADS','DUMBBELL',array['DB Forward Lunge']::text[],true),
  ('Dumbbell Lateral Lunge','WEIGHT_REPS','QUADS','DUMBBELL',array['DB Lateral Lunge','Dumbbell Side Lunge']::text[],true),
  ('Dumbbell Cyclist Squat','WEIGHT_REPS','QUADS','DUMBBELL',array['DB Cyclist Squat']::text[],true),
  ('Dumbbell Heels-Elevated Squat','WEIGHT_REPS','QUADS','DUMBBELL',array['DB Heels-Elevated Squat','Heels-Elevated DB Squat']::text[],true),
  ('Dumbbell Box Squat','WEIGHT_REPS','QUADS','DUMBBELL',array['DB Box Squat']::text[],true),
  ('Dumbbell Sumo Squat','WEIGHT_REPS','QUADS','DUMBBELL',array['DB Sumo Squat']::text[],true),
  ('Lean-Away Dumbbell Lateral Raise','WEIGHT_REPS','SHOULDERS','DUMBBELL',array['Lean Away Dumbbell Lateral Raise','Lean-Away DB Lateral Raise']::text[],true),
  ('Incline Dumbbell Lateral Raise','WEIGHT_REPS','SHOULDERS','DUMBBELL',array['Incline DB Lateral Raise']::text[],true),
  ('Seated Dumbbell Lateral Raise','WEIGHT_REPS','SHOULDERS','DUMBBELL',array['Seated DB Lateral Raise']::text[],true),
  ('Dumbbell Y-Raise','WEIGHT_REPS','SHOULDERS','DUMBBELL',array['DB Y-Raise','Dumbbell Y Raise']::text[],true),
  ('Dumbbell Scaption Raise','WEIGHT_REPS','SHOULDERS','DUMBBELL',array['DB Scaption Raise']::text[],true),
  ('Dumbbell Upright Row','WEIGHT_REPS','SHOULDERS','DUMBBELL',array['DB Upright Row']::text[],true),
  ('Dumbbell Rear Delt Row','WEIGHT_REPS','SHOULDERS','DUMBBELL',array['DB Rear Delt Row']::text[],true),
  ('Single-Arm Dumbbell Shoulder Press','WEIGHT_REPS','SHOULDERS','DUMBBELL',array['One-Arm Dumbbell Shoulder Press','Single-Arm DB Shoulder Press']::text[],true),
  ('Dumbbell Tate Press','WEIGHT_REPS','TRICEPS','DUMBBELL',array['DB Tate Press']::text[],true),
  ('Dumbbell Rolling Triceps Extension','WEIGHT_REPS','TRICEPS','DUMBBELL',array['DB Rolling Triceps Extension']::text[],true),
  ('Dumbbell Close-Grip Bench Press','WEIGHT_REPS','TRICEPS','DUMBBELL',array['Close-Grip DB Bench Press']::text[],true),
  ('Single-Arm Overhead Dumbbell Triceps Extension','WEIGHT_REPS','TRICEPS','DUMBBELL',array['Single-Arm DB Overhead Triceps Extension','One-Arm Overhead Dumbbell Triceps Extension']::text[],true),
  ('Seated Dumbbell Calf Raise','WEIGHT_REPS','CALVES','DUMBBELL',array['Seated DB Calf Raise']::text[],true),
  ('Single-Leg Dumbbell Calf Raise','WEIGHT_REPS','CALVES','DUMBBELL',array['Single-Leg DB Calf Raise','One-Leg Dumbbell Calf Raise']::text[],true),
  ('Dumbbell Clean','WEIGHT_REPS','FULL_BODY','DUMBBELL',array['DB Clean']::text[],true),
  ('Dumbbell Clean and Press','WEIGHT_REPS','FULL_BODY','DUMBBELL',array['DB Clean and Press']::text[],true),
  ('Dumbbell Hang Clean','WEIGHT_REPS','FULL_BODY','DUMBBELL',array['DB Hang Clean']::text[],true),
  ('Dumbbell Power Clean','WEIGHT_REPS','FULL_BODY','DUMBBELL',array['DB Power Clean']::text[],true),
  ('Dumbbell Snatch','WEIGHT_REPS','FULL_BODY','DUMBBELL',array['DB Snatch','Single-Arm Dumbbell Snatch']::text[],true),
  ('Dumbbell Hang Snatch','WEIGHT_REPS','FULL_BODY','DUMBBELL',array['DB Hang Snatch']::text[],true),
  ('Dumbbell Thruster','WEIGHT_REPS','FULL_BODY','DUMBBELL',array['DB Thruster']::text[],true),
  ('Dumbbell Devil Press','WEIGHT_REPS','FULL_BODY','DUMBBELL',array['DB Devil Press','Dumbbell Devil''s Press']::text[],true);

do $$
begin
  if (select count(*) from public.exercise_catalog where active = true) <> 464 then
    raise exception 'Phase 19.3A expected 464 active catalogue rows after expansion';
  end if;

  if (select count(*) from public.exercise_catalog where active = true and workout_type = 'DUMBBELL') <> 93 then
    raise exception 'Phase 19.3A expected 93 active dumbbell catalogue rows after expansion';
  end if;
end
$$;
