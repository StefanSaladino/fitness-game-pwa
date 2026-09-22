-- Phase 19.3B: reconcile the hosted 568-exercise catalogue back into source-controlled migrations.
-- Idempotent against both the old 464-row repository state and the already-updated hosted database.

with additions(canonical_name,measurement_type,primary_muscle_group,workout_type,aliases,template_name) as (
  values
  ('180-Degree Squat Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['180 Squat Jump','180-Degree Jump Squat']::text[],null),
  ('Kneeling Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Kneeling Squat Jump']::text[],null),
  ('Seated Box Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array[]::text[],null),
  ('Lateral Box Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Side Box Jump']::text[],null),
  ('Single-Leg Box Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Single Leg Box Jump']::text[],null),
  ('Jumping Bulgarian Split Squat','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Bulgarian Split Squat Jump']::text[],null),
  ('Depth Push-Up','BODYWEIGHT_REPS','CHEST','PLYOMETRIC',array['Depth Plyometric Push-Up']::text[],null),
  ('Explosive Push-Up to Box','BODYWEIGHT_REPS','CHEST','PLYOMETRIC',array['Plyometric Push-Up to Box']::text[],null),
  ('Plyometric Pull-Up','BODYWEIGHT_REPS','BACK','PLYOMETRIC',array['Explosive Pull-Up']::text[],null),
  ('Frog Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Frog Jumps']::text[],null),
  ('Lateral Pogo Jump','BODYWEIGHT_REPS','CALVES','PLYOMETRIC',array['Lateral Pogo']::text[],null),
  ('Single-Leg Pogo Jump','BODYWEIGHT_REPS','CALVES','PLYOMETRIC',array['Single Leg Pogo Jump']::text[],null),
  ('Egyptian Cable Lateral Raise','WEIGHT_REPS','SHOULDERS','CABLE',array['Egyptian Lateral Raise','Cable Egyptian Lateral Raise','Lean-Away Cable Lateral Raise']::text[],'Cable Lateral Raise'),
  ('Single-Arm Cable Biceps Curl','WEIGHT_REPS','BICEPS','CABLE',array['One-Arm Cable Curl','Single Arm Cable Curl']::text[],'Cable Biceps Curl'),
  ('Cable Preacher Curl','WEIGHT_REPS','BICEPS','CABLE',array[]::text[],'Cable Biceps Curl'),
  ('Cable Spider Curl','WEIGHT_REPS','BICEPS','CABLE',array[]::text[],'Cable Biceps Curl'),
  ('Cable Reverse Curl','WEIGHT_REPS','BICEPS','CABLE',array[]::text[],'Dumbbell Reverse Curl'),
  ('Cable Upright Row','WEIGHT_REPS','SHOULDERS','CABLE',array[]::text[],'Dumbbell Upright Row'),
  ('Cable Shrug','WEIGHT_REPS','BACK','CABLE',array[]::text[],'Dumbbell Shrug'),
  ('Cable Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','CABLE',array['Cable RDL']::text[],'Dumbbell Romanian Deadlift'),
  ('Cable Squat','WEIGHT_REPS','QUADS','CABLE',array[]::text[],'Landmine Squat'),
  ('Cable Reverse Lunge','WEIGHT_REPS','QUADS','CABLE',array[]::text[],'Barbell Reverse Lunge'),
  ('Cable Lateral Lunge','WEIGHT_REPS','QUADS','CABLE',array['Cable Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Cable Curtsy Lunge','WEIGHT_REPS','GLUTES','CABLE',array['Cable Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('Cable Leg Curl','WEIGHT_REPS','HAMSTRINGS','CABLE',array['Cable Hamstring Curl']::text[],'Lying Leg Curl'),
  ('Single-Arm Cable Chest Fly','WEIGHT_REPS','CHEST','CABLE',array['One-Arm Cable Fly','Single Arm Cable Fly']::text[],'Cable Chest Fly'),
  ('Single-Arm Cable Chest Press','WEIGHT_REPS','CHEST','CABLE',array['One-Arm Cable Chest Press']::text[],'Cable Chest Press'),
  ('Cable Rear Delt Row','WEIGHT_REPS','SHOULDERS','CABLE',array[]::text[],'Dumbbell Rear Delt Row'),
  ('Cable Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','CABLE',array[]::text[],'Dumbbell Wrist Curl'),
  ('Cable Reverse Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','CABLE',array[]::text[],'Dumbbell Reverse Wrist Curl'),
  ('Cable High Row','WEIGHT_REPS','BACK','CABLE',array[]::text[],'Machine High Row'),
  ('Cable Low Row','WEIGHT_REPS','BACK','CABLE',array[]::text[],'Machine Low Row'),
  ('Barbell Split Squat','WEIGHT_REPS','QUADS','BARBELL',array[]::text[],'Dumbbell Split Squat'),
  ('Barbell Forward Lunge','WEIGHT_REPS','QUADS','BARBELL',array[]::text[],'Dumbbell Forward Lunge'),
  ('Barbell Lateral Lunge','WEIGHT_REPS','QUADS','BARBELL',array['Barbell Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Barbell Curtsy Lunge','WEIGHT_REPS','GLUTES','BARBELL',array['Barbell Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('JM Press','WEIGHT_REPS','TRICEPS','BARBELL',array['Barbell JM Press']::text[],'Close-Grip Barbell Bench Press'),
  ('Spoto Press','WEIGHT_REPS','CHEST','BARBELL',array['Barbell Spoto Press']::text[],'Barbell Bench Press'),
  ('Larsen Press','WEIGHT_REPS','CHEST','BARBELL',array['Barbell Larsen Press']::text[],'Barbell Bench Press'),
  ('Paused Barbell Bench Press','WEIGHT_REPS','CHEST','BARBELL',array['Paused Bench Press']::text[],'Barbell Bench Press'),
  ('Pin Bench Press','WEIGHT_REPS','CHEST','BARBELL',array['Barbell Pin Press']::text[],'Barbell Bench Press'),
  ('Board Press','WEIGHT_REPS','CHEST','BARBELL',array['Barbell Board Press']::text[],'Barbell Bench Press'),
  ('Seal Row','WEIGHT_REPS','BACK','BARBELL',array['Barbell Seal Row']::text[],'Chest-Supported Dumbbell Row'),
  ('Chest-Supported Barbell Row','WEIGHT_REPS','BACK','BARBELL',array['Barbell Chest-Supported Row']::text[],'Chest-Supported Dumbbell Row'),
  ('Barbell Upright Row','WEIGHT_REPS','SHOULDERS','BARBELL',array[]::text[],'Dumbbell Upright Row'),
  ('Bradford Press','WEIGHT_REPS','SHOULDERS','BARBELL',array['Barbell Bradford Press']::text[],'Overhead Press'),
  ('Reverse-Grip Barbell Bench Press','WEIGHT_REPS','CHEST','BARBELL',array['Reverse Grip Bench Press']::text[],'Barbell Bench Press'),
  ('Barbell Sumo Squat','WEIGHT_REPS','QUADS','BARBELL',array[]::text[],'Dumbbell Sumo Squat'),
  ('Barbell Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','BARBELL',array[]::text[],'Dumbbell Wrist Curl'),
  ('Barbell Reverse Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','BARBELL',array[]::text[],'Dumbbell Reverse Wrist Curl'),
  ('Barbell B-Stance Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','BARBELL',array['Barbell Kickstand RDL','B-Stance Barbell RDL']::text[],'Dumbbell Kickstand Romanian Deadlift'),
  ('Barbell B-Stance Hip Thrust','WEIGHT_REPS','GLUTES','BARBELL',array['B-Stance Barbell Hip Thrust']::text[],'Barbell Hip Thrust'),
  ('Bodyweight Forward Lunge','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Forward Lunge']::text[],'Dumbbell Forward Lunge'),
  ('Bodyweight Lateral Lunge','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Bodyweight Side Lunge','Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Bodyweight Curtsy Lunge','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Curtsy Lunge','Curtsy Squat','Bodyweight Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('Reverse Crunch','BODYWEIGHT_REPS','CORE','BODYWEIGHT',array[]::text[],'Crunch'),
  ('V-Up','BODYWEIGHT_REPS','CORE','BODYWEIGHT',array['V Up','V-Sit Up']::text[],'Sit-Up'),
  ('Lying Leg Raise','BODYWEIGHT_REPS','CORE','BODYWEIGHT',array['Floor Leg Raise']::text[],'Hanging Leg Raise'),
  ('Dragon Flag','BODYWEIGHT_REPS','CORE','BODYWEIGHT',array[]::text[],'Hanging Leg Raise'),
  ('Archer Push-Up','BODYWEIGHT_REPS','CHEST','BODYWEIGHT',array['Archer Pushup']::text[],'Push-Up'),
  ('One-Arm Push-Up','BODYWEIGHT_REPS','CHEST','BODYWEIGHT',array['One Arm Push-Up','Single-Arm Push-Up']::text[],'Push-Up'),
  ('Archer Pull-Up','BODYWEIGHT_REPS','BACK','BODYWEIGHT',array['Archer Pullup']::text[],'Pull-Up'),
  ('Sternum Pull-Up','BODYWEIGHT_REPS','BACK','BODYWEIGHT',array['Gironda Pull-Up','Sternum Pullup']::text[],'Pull-Up'),
  ('Hindu Push-Up','BODYWEIGHT_REPS','CHEST','BODYWEIGHT',array['Hindu Pushup']::text[],'Push-Up'),
  ('Pseudo Planche Push-Up','BODYWEIGHT_REPS','SHOULDERS','BODYWEIGHT',array['Pseudo Planche Pushup']::text[],'Pike Push-Up'),
  ('Bench Dip','BODYWEIGHT_REPS','TRICEPS','BODYWEIGHT',array['Bench Triceps Dip']::text[],'Dip'),
  ('Step-Down','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Step Down']::text[],'Bodyweight Step-Up'),
  ('Single-Leg Sit-to-Stand','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Single Leg Sit to Stand','Single-Leg Chair Squat']::text[],'Pistol Squat'),
  ('Frog Pump','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Bodyweight Frog Pump']::text[],'Dumbbell Frog Pump'),
  ('Donkey Kick','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Bodyweight Donkey Kick']::text[],'Machine Glute Kickback'),
  ('Fire Hydrant','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Quadruped Hip Abduction']::text[],'Cable Hip Abduction'),
  ('Side-Lying Hip Abduction','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Side Lying Leg Raise']::text[],'Cable Hip Abduction'),
  ('Single-Leg Hip Thrust','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Single Leg Hip Thrust']::text[],'Bodyweight Hip Thrust'),
  ('Heel-Elevated Bodyweight Squat','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Bodyweight Heels-Elevated Squat','Bodyweight Cyclist Squat']::text[],'Bodyweight Squat'),
  ('Kettlebell Bulgarian Split Squat','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Bulgarian Split Squat']::text[],'Dumbbell Bulgarian Split Squat'),
  ('Kettlebell Reverse Lunge','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Reverse Lunge']::text[],'Dumbbell Reverse Lunge'),
  ('Kettlebell Walking Lunge','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Walking Lunge']::text[],'Dumbbell Walking Lunge'),
  ('Kettlebell Curtsy Lunge','WEIGHT_REPS','GLUTES','KETTLEBELL',array['KB Curtsy Lunge','Kettlebell Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('Kettlebell Lateral Lunge','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Lateral Lunge','Kettlebell Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Kettlebell Sumo Squat','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Sumo Squat']::text[],'Dumbbell Sumo Squat'),
  ('Double Kettlebell Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','KETTLEBELL',array['Double KB RDL']::text[],'Kettlebell Romanian Deadlift'),
  ('Double Kettlebell Deadlift','WEIGHT_REPS','HAMSTRINGS','KETTLEBELL',array['Double KB Deadlift']::text[],'Kettlebell Deadlift'),
  ('Double Kettlebell Strict Press','WEIGHT_REPS','SHOULDERS','KETTLEBELL',array['Double KB Strict Press']::text[],'Kettlebell Strict Press'),
  ('Double Kettlebell Bent-Over Row','WEIGHT_REPS','BACK','KETTLEBELL',array['Double KB Bent-Over Row']::text[],'Kettlebell Bent-Over Row'),
  ('Kettlebell Biceps Curl','WEIGHT_REPS','BICEPS','KETTLEBELL',array['KB Biceps Curl']::text[],'Dumbbell Biceps Curl'),
  ('Kettlebell Triceps Extension','WEIGHT_REPS','TRICEPS','KETTLEBELL',array['KB Triceps Extension']::text[],'Dumbbell Triceps Extension'),
  ('Kettlebell Calf Raise','WEIGHT_REPS','CALVES','KETTLEBELL',array['KB Calf Raise']::text[],'Dumbbell Calf Raise'),
  ('Kettlebell Step-Up','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Step-Up']::text[],'Dumbbell Step-Up'),
  ('Kettlebell Hip Thrust','WEIGHT_REPS','GLUTES','KETTLEBELL',array['KB Hip Thrust']::text[],'Dumbbell Hip Thrust'),
  ('Kettlebell Glute Bridge','WEIGHT_REPS','GLUTES','KETTLEBELL',array['KB Glute Bridge']::text[],'Dumbbell Glute Bridge'),
  ('Kettlebell Lateral Raise','WEIGHT_REPS','SHOULDERS','KETTLEBELL',array['KB Lateral Raise']::text[],'Dumbbell Lateral Raise'),
  ('Kettlebell Front Raise','WEIGHT_REPS','SHOULDERS','KETTLEBELL',array['KB Front Raise']::text[],'Dumbbell Front Raise'),
  ('Kettlebell Shrug','WEIGHT_REPS','BACK','KETTLEBELL',array['KB Shrug']::text[],'Dumbbell Shrug'),
  ('Kettlebell Chest-Supported Row','WEIGHT_REPS','BACK','KETTLEBELL',array['KB Chest-Supported Row']::text[],'Chest-Supported Dumbbell Row'),
  ('Landmine Split Squat','WEIGHT_REPS','QUADS','LANDMINE',array[]::text[],'Dumbbell Split Squat'),
  ('Landmine Bulgarian Split Squat','WEIGHT_REPS','QUADS','LANDMINE',array[]::text[],'Dumbbell Bulgarian Split Squat'),
  ('Landmine Lateral Lunge','WEIGHT_REPS','QUADS','LANDMINE',array['Landmine Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Landmine Curtsy Lunge','WEIGHT_REPS','GLUTES','LANDMINE',array['Landmine Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('Landmine Calf Raise','WEIGHT_REPS','CALVES','LANDMINE',array[]::text[],'Barbell Calf Raise'),
  ('Landmine Single-Leg Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','LANDMINE',array['Landmine Single-Leg RDL']::text[],'Dumbbell Single-Leg Romanian Deadlift'),
  ('Landmine High Row','WEIGHT_REPS','BACK','LANDMINE',array[]::text[],'Dumbbell High Row'),
  ('Glute Ham Raise','BODYWEIGHT_REPS','HAMSTRINGS','SPECIALTY',array['GHR','Glute-Ham Raise']::text[],'Nordic Hamstring Curl'),
  ('45-Degree Hip Extension','BODYWEIGHT_REPS','GLUTES','SPECIALTY',array['45 Degree Hip Extension','45-Degree Glute Extension']::text[],'GHD Hip Extension'),
  ('Single-Leg 45-Degree Hip Extension','BODYWEIGHT_REPS','GLUTES','SPECIALTY',array['Single Leg 45 Degree Hip Extension']::text[],'GHD Hip Extension')
)
insert into public.exercise_catalog
  (canonical_name,measurement_type,primary_muscle_group,workout_type,aliases,active)
select canonical_name,measurement_type,primary_muscle_group,workout_type,aliases,true
from additions
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    primary_muscle_group = excluded.primary_muscle_group,
    workout_type = excluded.workout_type,
    aliases = excluded.aliases,
    active = true;

-- Rep-based plyometrics use the existing bodyweight set model so they can be logged
-- as plain reps or with added load. Jump Rope remains duration-based.
update public.exercise_catalog
set measurement_type = 'BODYWEIGHT_REPS'
where active = true
  and workout_type = 'PLYOMETRIC'
  and canonical_name <> 'Jump Rope';

update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Egyptian Dumbbell Lateral Raise','Dumbbell Egyptian Lateral Raise','Egyptian DB Lateral Raise']::text[]) as x
)
where canonical_name = 'Lean-Away Dumbbell Lateral Raise';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Dumbbell Curtsy Squat','DB Curtsy Squat']::text[]) as x
)
where canonical_name = 'Dumbbell Curtsy Lunge';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Jump Squat','Jump Squats','Squat Jumps','Weighted Squat Jump','Weighted Jump Squat','Dumbbell Jump Squat','Kettlebell Jump Squat']::text[]) as x
)
where canonical_name = 'Squat Jump';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Jump Lunge','Jump Lunges','Jumping Lunges','Weighted Jumping Lunge','Dumbbell Jumping Lunge','Kettlebell Jumping Lunge']::text[]) as x
)
where canonical_name = 'Jumping Lunge';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Split Squat Jumps','Weighted Split Squat Jump','Dumbbell Split Squat Jump']::text[]) as x
)
where canonical_name = 'Split Squat Jump';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Weighted Box Jump','Dumbbell Box Jump']::text[]) as x
)
where canonical_name = 'Box Jump';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Standing Broad Jump','Weighted Broad Jump']::text[]) as x
)
where canonical_name = 'Broad Jump';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Explosive Push-Up']::text[]) as x
)
where canonical_name = 'Plyometric Push-Up';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Clapping Push-Up']::text[]) as x
)
where canonical_name = 'Clap Push-Up';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Pogo Jumps']::text[]) as x
)
where canonical_name = 'Pogo Jump';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Skater Hop','Skater Hops']::text[]) as x
)
where canonical_name = 'Skater Jump';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Burpees']::text[]) as x
)
where canonical_name = 'Burpee';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Burpee Box Jumps']::text[]) as x
)
where canonical_name = 'Burpee Box Jump';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Double Unders']::text[]) as x
)
where canonical_name = 'Double-Under';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Depth Jumps']::text[]) as x
)
where canonical_name = 'Depth Jump';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Drop Jumps']::text[]) as x
)
where canonical_name = 'Drop Jump';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Hurdle Hops']::text[]) as x
)
where canonical_name = 'Hurdle Hop';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Tuck Jumps']::text[]) as x
)
where canonical_name = 'Tuck Jump';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Lateral Bounds']::text[]) as x
)
where canonical_name = 'Lateral Bound';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Power Skips']::text[]) as x
)
where canonical_name = 'Power Skip';
update public.exercise_catalog
set aliases = (
  select coalesce(array_agg(distinct x order by x), array[]::text[])
  from unnest(aliases || array['Single Leg Broad Jumps']::text[]) as x
)
where canonical_name = 'Single-Leg Broad Jump';

-- Every new exercise receives an explicit muscle-volume-v1 decision. Normal strength
-- variants reuse the reviewed contribution model of the closest existing pattern.
with additions(canonical_name,measurement_type,primary_muscle_group,workout_type,aliases,template_name) as (
  values
  ('180-Degree Squat Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['180 Squat Jump','180-Degree Jump Squat']::text[],null),
  ('Kneeling Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Kneeling Squat Jump']::text[],null),
  ('Seated Box Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array[]::text[],null),
  ('Lateral Box Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Side Box Jump']::text[],null),
  ('Single-Leg Box Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Single Leg Box Jump']::text[],null),
  ('Jumping Bulgarian Split Squat','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Bulgarian Split Squat Jump']::text[],null),
  ('Depth Push-Up','BODYWEIGHT_REPS','CHEST','PLYOMETRIC',array['Depth Plyometric Push-Up']::text[],null),
  ('Explosive Push-Up to Box','BODYWEIGHT_REPS','CHEST','PLYOMETRIC',array['Plyometric Push-Up to Box']::text[],null),
  ('Plyometric Pull-Up','BODYWEIGHT_REPS','BACK','PLYOMETRIC',array['Explosive Pull-Up']::text[],null),
  ('Frog Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Frog Jumps']::text[],null),
  ('Lateral Pogo Jump','BODYWEIGHT_REPS','CALVES','PLYOMETRIC',array['Lateral Pogo']::text[],null),
  ('Single-Leg Pogo Jump','BODYWEIGHT_REPS','CALVES','PLYOMETRIC',array['Single Leg Pogo Jump']::text[],null),
  ('Egyptian Cable Lateral Raise','WEIGHT_REPS','SHOULDERS','CABLE',array['Egyptian Lateral Raise','Cable Egyptian Lateral Raise','Lean-Away Cable Lateral Raise']::text[],'Cable Lateral Raise'),
  ('Single-Arm Cable Biceps Curl','WEIGHT_REPS','BICEPS','CABLE',array['One-Arm Cable Curl','Single Arm Cable Curl']::text[],'Cable Biceps Curl'),
  ('Cable Preacher Curl','WEIGHT_REPS','BICEPS','CABLE',array[]::text[],'Cable Biceps Curl'),
  ('Cable Spider Curl','WEIGHT_REPS','BICEPS','CABLE',array[]::text[],'Cable Biceps Curl'),
  ('Cable Reverse Curl','WEIGHT_REPS','BICEPS','CABLE',array[]::text[],'Dumbbell Reverse Curl'),
  ('Cable Upright Row','WEIGHT_REPS','SHOULDERS','CABLE',array[]::text[],'Dumbbell Upright Row'),
  ('Cable Shrug','WEIGHT_REPS','BACK','CABLE',array[]::text[],'Dumbbell Shrug'),
  ('Cable Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','CABLE',array['Cable RDL']::text[],'Dumbbell Romanian Deadlift'),
  ('Cable Squat','WEIGHT_REPS','QUADS','CABLE',array[]::text[],'Landmine Squat'),
  ('Cable Reverse Lunge','WEIGHT_REPS','QUADS','CABLE',array[]::text[],'Barbell Reverse Lunge'),
  ('Cable Lateral Lunge','WEIGHT_REPS','QUADS','CABLE',array['Cable Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Cable Curtsy Lunge','WEIGHT_REPS','GLUTES','CABLE',array['Cable Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('Cable Leg Curl','WEIGHT_REPS','HAMSTRINGS','CABLE',array['Cable Hamstring Curl']::text[],'Lying Leg Curl'),
  ('Single-Arm Cable Chest Fly','WEIGHT_REPS','CHEST','CABLE',array['One-Arm Cable Fly','Single Arm Cable Fly']::text[],'Cable Chest Fly'),
  ('Single-Arm Cable Chest Press','WEIGHT_REPS','CHEST','CABLE',array['One-Arm Cable Chest Press']::text[],'Cable Chest Press'),
  ('Cable Rear Delt Row','WEIGHT_REPS','SHOULDERS','CABLE',array[]::text[],'Dumbbell Rear Delt Row'),
  ('Cable Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','CABLE',array[]::text[],'Dumbbell Wrist Curl'),
  ('Cable Reverse Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','CABLE',array[]::text[],'Dumbbell Reverse Wrist Curl'),
  ('Cable High Row','WEIGHT_REPS','BACK','CABLE',array[]::text[],'Machine High Row'),
  ('Cable Low Row','WEIGHT_REPS','BACK','CABLE',array[]::text[],'Machine Low Row'),
  ('Barbell Split Squat','WEIGHT_REPS','QUADS','BARBELL',array[]::text[],'Dumbbell Split Squat'),
  ('Barbell Forward Lunge','WEIGHT_REPS','QUADS','BARBELL',array[]::text[],'Dumbbell Forward Lunge'),
  ('Barbell Lateral Lunge','WEIGHT_REPS','QUADS','BARBELL',array['Barbell Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Barbell Curtsy Lunge','WEIGHT_REPS','GLUTES','BARBELL',array['Barbell Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('JM Press','WEIGHT_REPS','TRICEPS','BARBELL',array['Barbell JM Press']::text[],'Close-Grip Barbell Bench Press'),
  ('Spoto Press','WEIGHT_REPS','CHEST','BARBELL',array['Barbell Spoto Press']::text[],'Barbell Bench Press'),
  ('Larsen Press','WEIGHT_REPS','CHEST','BARBELL',array['Barbell Larsen Press']::text[],'Barbell Bench Press'),
  ('Paused Barbell Bench Press','WEIGHT_REPS','CHEST','BARBELL',array['Paused Bench Press']::text[],'Barbell Bench Press'),
  ('Pin Bench Press','WEIGHT_REPS','CHEST','BARBELL',array['Barbell Pin Press']::text[],'Barbell Bench Press'),
  ('Board Press','WEIGHT_REPS','CHEST','BARBELL',array['Barbell Board Press']::text[],'Barbell Bench Press'),
  ('Seal Row','WEIGHT_REPS','BACK','BARBELL',array['Barbell Seal Row']::text[],'Chest-Supported Dumbbell Row'),
  ('Chest-Supported Barbell Row','WEIGHT_REPS','BACK','BARBELL',array['Barbell Chest-Supported Row']::text[],'Chest-Supported Dumbbell Row'),
  ('Barbell Upright Row','WEIGHT_REPS','SHOULDERS','BARBELL',array[]::text[],'Dumbbell Upright Row'),
  ('Bradford Press','WEIGHT_REPS','SHOULDERS','BARBELL',array['Barbell Bradford Press']::text[],'Overhead Press'),
  ('Reverse-Grip Barbell Bench Press','WEIGHT_REPS','CHEST','BARBELL',array['Reverse Grip Bench Press']::text[],'Barbell Bench Press'),
  ('Barbell Sumo Squat','WEIGHT_REPS','QUADS','BARBELL',array[]::text[],'Dumbbell Sumo Squat'),
  ('Barbell Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','BARBELL',array[]::text[],'Dumbbell Wrist Curl'),
  ('Barbell Reverse Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','BARBELL',array[]::text[],'Dumbbell Reverse Wrist Curl'),
  ('Barbell B-Stance Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','BARBELL',array['Barbell Kickstand RDL','B-Stance Barbell RDL']::text[],'Dumbbell Kickstand Romanian Deadlift'),
  ('Barbell B-Stance Hip Thrust','WEIGHT_REPS','GLUTES','BARBELL',array['B-Stance Barbell Hip Thrust']::text[],'Barbell Hip Thrust'),
  ('Bodyweight Forward Lunge','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Forward Lunge']::text[],'Dumbbell Forward Lunge'),
  ('Bodyweight Lateral Lunge','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Bodyweight Side Lunge','Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Bodyweight Curtsy Lunge','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Curtsy Lunge','Curtsy Squat','Bodyweight Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('Reverse Crunch','BODYWEIGHT_REPS','CORE','BODYWEIGHT',array[]::text[],'Crunch'),
  ('V-Up','BODYWEIGHT_REPS','CORE','BODYWEIGHT',array['V Up','V-Sit Up']::text[],'Sit-Up'),
  ('Lying Leg Raise','BODYWEIGHT_REPS','CORE','BODYWEIGHT',array['Floor Leg Raise']::text[],'Hanging Leg Raise'),
  ('Dragon Flag','BODYWEIGHT_REPS','CORE','BODYWEIGHT',array[]::text[],'Hanging Leg Raise'),
  ('Archer Push-Up','BODYWEIGHT_REPS','CHEST','BODYWEIGHT',array['Archer Pushup']::text[],'Push-Up'),
  ('One-Arm Push-Up','BODYWEIGHT_REPS','CHEST','BODYWEIGHT',array['One Arm Push-Up','Single-Arm Push-Up']::text[],'Push-Up'),
  ('Archer Pull-Up','BODYWEIGHT_REPS','BACK','BODYWEIGHT',array['Archer Pullup']::text[],'Pull-Up'),
  ('Sternum Pull-Up','BODYWEIGHT_REPS','BACK','BODYWEIGHT',array['Gironda Pull-Up','Sternum Pullup']::text[],'Pull-Up'),
  ('Hindu Push-Up','BODYWEIGHT_REPS','CHEST','BODYWEIGHT',array['Hindu Pushup']::text[],'Push-Up'),
  ('Pseudo Planche Push-Up','BODYWEIGHT_REPS','SHOULDERS','BODYWEIGHT',array['Pseudo Planche Pushup']::text[],'Pike Push-Up'),
  ('Bench Dip','BODYWEIGHT_REPS','TRICEPS','BODYWEIGHT',array['Bench Triceps Dip']::text[],'Dip'),
  ('Step-Down','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Step Down']::text[],'Bodyweight Step-Up'),
  ('Single-Leg Sit-to-Stand','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Single Leg Sit to Stand','Single-Leg Chair Squat']::text[],'Pistol Squat'),
  ('Frog Pump','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Bodyweight Frog Pump']::text[],'Dumbbell Frog Pump'),
  ('Donkey Kick','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Bodyweight Donkey Kick']::text[],'Machine Glute Kickback'),
  ('Fire Hydrant','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Quadruped Hip Abduction']::text[],'Cable Hip Abduction'),
  ('Side-Lying Hip Abduction','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Side Lying Leg Raise']::text[],'Cable Hip Abduction'),
  ('Single-Leg Hip Thrust','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Single Leg Hip Thrust']::text[],'Bodyweight Hip Thrust'),
  ('Heel-Elevated Bodyweight Squat','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Bodyweight Heels-Elevated Squat','Bodyweight Cyclist Squat']::text[],'Bodyweight Squat'),
  ('Kettlebell Bulgarian Split Squat','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Bulgarian Split Squat']::text[],'Dumbbell Bulgarian Split Squat'),
  ('Kettlebell Reverse Lunge','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Reverse Lunge']::text[],'Dumbbell Reverse Lunge'),
  ('Kettlebell Walking Lunge','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Walking Lunge']::text[],'Dumbbell Walking Lunge'),
  ('Kettlebell Curtsy Lunge','WEIGHT_REPS','GLUTES','KETTLEBELL',array['KB Curtsy Lunge','Kettlebell Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('Kettlebell Lateral Lunge','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Lateral Lunge','Kettlebell Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Kettlebell Sumo Squat','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Sumo Squat']::text[],'Dumbbell Sumo Squat'),
  ('Double Kettlebell Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','KETTLEBELL',array['Double KB RDL']::text[],'Kettlebell Romanian Deadlift'),
  ('Double Kettlebell Deadlift','WEIGHT_REPS','HAMSTRINGS','KETTLEBELL',array['Double KB Deadlift']::text[],'Kettlebell Deadlift'),
  ('Double Kettlebell Strict Press','WEIGHT_REPS','SHOULDERS','KETTLEBELL',array['Double KB Strict Press']::text[],'Kettlebell Strict Press'),
  ('Double Kettlebell Bent-Over Row','WEIGHT_REPS','BACK','KETTLEBELL',array['Double KB Bent-Over Row']::text[],'Kettlebell Bent-Over Row'),
  ('Kettlebell Biceps Curl','WEIGHT_REPS','BICEPS','KETTLEBELL',array['KB Biceps Curl']::text[],'Dumbbell Biceps Curl'),
  ('Kettlebell Triceps Extension','WEIGHT_REPS','TRICEPS','KETTLEBELL',array['KB Triceps Extension']::text[],'Dumbbell Triceps Extension'),
  ('Kettlebell Calf Raise','WEIGHT_REPS','CALVES','KETTLEBELL',array['KB Calf Raise']::text[],'Dumbbell Calf Raise'),
  ('Kettlebell Step-Up','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Step-Up']::text[],'Dumbbell Step-Up'),
  ('Kettlebell Hip Thrust','WEIGHT_REPS','GLUTES','KETTLEBELL',array['KB Hip Thrust']::text[],'Dumbbell Hip Thrust'),
  ('Kettlebell Glute Bridge','WEIGHT_REPS','GLUTES','KETTLEBELL',array['KB Glute Bridge']::text[],'Dumbbell Glute Bridge'),
  ('Kettlebell Lateral Raise','WEIGHT_REPS','SHOULDERS','KETTLEBELL',array['KB Lateral Raise']::text[],'Dumbbell Lateral Raise'),
  ('Kettlebell Front Raise','WEIGHT_REPS','SHOULDERS','KETTLEBELL',array['KB Front Raise']::text[],'Dumbbell Front Raise'),
  ('Kettlebell Shrug','WEIGHT_REPS','BACK','KETTLEBELL',array['KB Shrug']::text[],'Dumbbell Shrug'),
  ('Kettlebell Chest-Supported Row','WEIGHT_REPS','BACK','KETTLEBELL',array['KB Chest-Supported Row']::text[],'Chest-Supported Dumbbell Row'),
  ('Landmine Split Squat','WEIGHT_REPS','QUADS','LANDMINE',array[]::text[],'Dumbbell Split Squat'),
  ('Landmine Bulgarian Split Squat','WEIGHT_REPS','QUADS','LANDMINE',array[]::text[],'Dumbbell Bulgarian Split Squat'),
  ('Landmine Lateral Lunge','WEIGHT_REPS','QUADS','LANDMINE',array['Landmine Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Landmine Curtsy Lunge','WEIGHT_REPS','GLUTES','LANDMINE',array['Landmine Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('Landmine Calf Raise','WEIGHT_REPS','CALVES','LANDMINE',array[]::text[],'Barbell Calf Raise'),
  ('Landmine Single-Leg Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','LANDMINE',array['Landmine Single-Leg RDL']::text[],'Dumbbell Single-Leg Romanian Deadlift'),
  ('Landmine High Row','WEIGHT_REPS','BACK','LANDMINE',array[]::text[],'Dumbbell High Row'),
  ('Glute Ham Raise','BODYWEIGHT_REPS','HAMSTRINGS','SPECIALTY',array['GHR','Glute-Ham Raise']::text[],'Nordic Hamstring Curl'),
  ('45-Degree Hip Extension','BODYWEIGHT_REPS','GLUTES','SPECIALTY',array['45 Degree Hip Extension','45-Degree Glute Extension']::text[],'GHD Hip Extension'),
  ('Single-Leg 45-Degree Hip Extension','BODYWEIGHT_REPS','GLUTES','SPECIALTY',array['Single Leg 45 Degree Hip Extension']::text[],'GHD Hip Extension')
)
insert into public.muscle_volume_exercise_rules
  (methodology_version,exercise_id,volume_eligible,set_quality_mode,mapping_confidence,review_flag,rationale)
select
  'muscle-volume-v1',
  e.id,
  case when a.template_name is null then false else tr.volume_eligible end,
  case
    when a.template_name is null then 'NONE'
    when a.measurement_type = 'BODYWEIGHT_REPS' then 'BODYWEIGHT_REPS'
    else tr.set_quality_mode
  end,
  case when a.template_name is null then 'HIGH' else tr.mapping_confidence end,
  case when a.template_name is null then true else tr.review_flag end,
  case
    when a.template_name is null then
      'Plyometric/ballistic movement is trackable by repetitions and optional added load, but remains excluded from muscle-volume-v1 because the current hypertrophy set-stimulus model is not calibrated for explosive contacts.'
    else
      tr.rationale || ' This equipment/bodyweight variant uses the same reviewed movement-pattern contribution model as ' || a.template_name || '.'
  end
from additions a
join public.exercise_catalog e on e.canonical_name = a.canonical_name
left join public.exercise_catalog t on t.canonical_name = a.template_name
left join public.muscle_volume_exercise_rules tr
  on tr.exercise_id = t.id and tr.methodology_version = 'muscle-volume-v1'
on conflict (methodology_version,exercise_id) do update
set volume_eligible = excluded.volume_eligible,
    set_quality_mode = excluded.set_quality_mode,
    mapping_confidence = excluded.mapping_confidence,
    review_flag = excluded.review_flag,
    rationale = excluded.rationale;

-- Rebuild contributions for these 104 rows deterministically.
delete from public.muscle_volume_exercise_contributions c
using public.exercise_catalog e
where c.methodology_version = 'muscle-volume-v1'
  and c.exercise_id = e.id
  and e.canonical_name = any(array['180-Degree Squat Jump','Kneeling Jump','Seated Box Jump','Lateral Box Jump','Single-Leg Box Jump','Jumping Bulgarian Split Squat','Depth Push-Up','Explosive Push-Up to Box','Plyometric Pull-Up','Frog Jump','Lateral Pogo Jump','Single-Leg Pogo Jump','Egyptian Cable Lateral Raise','Single-Arm Cable Biceps Curl','Cable Preacher Curl','Cable Spider Curl','Cable Reverse Curl','Cable Upright Row','Cable Shrug','Cable Romanian Deadlift','Cable Squat','Cable Reverse Lunge','Cable Lateral Lunge','Cable Curtsy Lunge','Cable Leg Curl','Single-Arm Cable Chest Fly','Single-Arm Cable Chest Press','Cable Rear Delt Row','Cable Wrist Curl','Cable Reverse Wrist Curl','Cable High Row','Cable Low Row','Barbell Split Squat','Barbell Forward Lunge','Barbell Lateral Lunge','Barbell Curtsy Lunge','JM Press','Spoto Press','Larsen Press','Paused Barbell Bench Press','Pin Bench Press','Board Press','Seal Row','Chest-Supported Barbell Row','Barbell Upright Row','Bradford Press','Reverse-Grip Barbell Bench Press','Barbell Sumo Squat','Barbell Wrist Curl','Barbell Reverse Wrist Curl','Barbell B-Stance Romanian Deadlift','Barbell B-Stance Hip Thrust','Bodyweight Forward Lunge','Bodyweight Lateral Lunge','Bodyweight Curtsy Lunge','Reverse Crunch','V-Up','Lying Leg Raise','Dragon Flag','Archer Push-Up','One-Arm Push-Up','Archer Pull-Up','Sternum Pull-Up','Hindu Push-Up','Pseudo Planche Push-Up','Bench Dip','Step-Down','Single-Leg Sit-to-Stand','Frog Pump','Donkey Kick','Fire Hydrant','Side-Lying Hip Abduction','Single-Leg Hip Thrust','Heel-Elevated Bodyweight Squat','Kettlebell Bulgarian Split Squat','Kettlebell Reverse Lunge','Kettlebell Walking Lunge','Kettlebell Curtsy Lunge','Kettlebell Lateral Lunge','Kettlebell Sumo Squat','Double Kettlebell Romanian Deadlift','Double Kettlebell Deadlift','Double Kettlebell Strict Press','Double Kettlebell Bent-Over Row','Kettlebell Biceps Curl','Kettlebell Triceps Extension','Kettlebell Calf Raise','Kettlebell Step-Up','Kettlebell Hip Thrust','Kettlebell Glute Bridge','Kettlebell Lateral Raise','Kettlebell Front Raise','Kettlebell Shrug','Kettlebell Chest-Supported Row','Landmine Split Squat','Landmine Bulgarian Split Squat','Landmine Lateral Lunge','Landmine Curtsy Lunge','Landmine Calf Raise','Landmine Single-Leg Romanian Deadlift','Landmine High Row','Glute Ham Raise','45-Degree Hip Extension','Single-Leg 45-Degree Hip Extension']::text[]);

with additions(canonical_name,measurement_type,primary_muscle_group,workout_type,aliases,template_name) as (
  values
  ('180-Degree Squat Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['180 Squat Jump','180-Degree Jump Squat']::text[],null),
  ('Kneeling Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Kneeling Squat Jump']::text[],null),
  ('Seated Box Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array[]::text[],null),
  ('Lateral Box Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Side Box Jump']::text[],null),
  ('Single-Leg Box Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Single Leg Box Jump']::text[],null),
  ('Jumping Bulgarian Split Squat','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Bulgarian Split Squat Jump']::text[],null),
  ('Depth Push-Up','BODYWEIGHT_REPS','CHEST','PLYOMETRIC',array['Depth Plyometric Push-Up']::text[],null),
  ('Explosive Push-Up to Box','BODYWEIGHT_REPS','CHEST','PLYOMETRIC',array['Plyometric Push-Up to Box']::text[],null),
  ('Plyometric Pull-Up','BODYWEIGHT_REPS','BACK','PLYOMETRIC',array['Explosive Pull-Up']::text[],null),
  ('Frog Jump','BODYWEIGHT_REPS','QUADS','PLYOMETRIC',array['Frog Jumps']::text[],null),
  ('Lateral Pogo Jump','BODYWEIGHT_REPS','CALVES','PLYOMETRIC',array['Lateral Pogo']::text[],null),
  ('Single-Leg Pogo Jump','BODYWEIGHT_REPS','CALVES','PLYOMETRIC',array['Single Leg Pogo Jump']::text[],null),
  ('Egyptian Cable Lateral Raise','WEIGHT_REPS','SHOULDERS','CABLE',array['Egyptian Lateral Raise','Cable Egyptian Lateral Raise','Lean-Away Cable Lateral Raise']::text[],'Cable Lateral Raise'),
  ('Single-Arm Cable Biceps Curl','WEIGHT_REPS','BICEPS','CABLE',array['One-Arm Cable Curl','Single Arm Cable Curl']::text[],'Cable Biceps Curl'),
  ('Cable Preacher Curl','WEIGHT_REPS','BICEPS','CABLE',array[]::text[],'Cable Biceps Curl'),
  ('Cable Spider Curl','WEIGHT_REPS','BICEPS','CABLE',array[]::text[],'Cable Biceps Curl'),
  ('Cable Reverse Curl','WEIGHT_REPS','BICEPS','CABLE',array[]::text[],'Dumbbell Reverse Curl'),
  ('Cable Upright Row','WEIGHT_REPS','SHOULDERS','CABLE',array[]::text[],'Dumbbell Upright Row'),
  ('Cable Shrug','WEIGHT_REPS','BACK','CABLE',array[]::text[],'Dumbbell Shrug'),
  ('Cable Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','CABLE',array['Cable RDL']::text[],'Dumbbell Romanian Deadlift'),
  ('Cable Squat','WEIGHT_REPS','QUADS','CABLE',array[]::text[],'Landmine Squat'),
  ('Cable Reverse Lunge','WEIGHT_REPS','QUADS','CABLE',array[]::text[],'Barbell Reverse Lunge'),
  ('Cable Lateral Lunge','WEIGHT_REPS','QUADS','CABLE',array['Cable Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Cable Curtsy Lunge','WEIGHT_REPS','GLUTES','CABLE',array['Cable Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('Cable Leg Curl','WEIGHT_REPS','HAMSTRINGS','CABLE',array['Cable Hamstring Curl']::text[],'Lying Leg Curl'),
  ('Single-Arm Cable Chest Fly','WEIGHT_REPS','CHEST','CABLE',array['One-Arm Cable Fly','Single Arm Cable Fly']::text[],'Cable Chest Fly'),
  ('Single-Arm Cable Chest Press','WEIGHT_REPS','CHEST','CABLE',array['One-Arm Cable Chest Press']::text[],'Cable Chest Press'),
  ('Cable Rear Delt Row','WEIGHT_REPS','SHOULDERS','CABLE',array[]::text[],'Dumbbell Rear Delt Row'),
  ('Cable Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','CABLE',array[]::text[],'Dumbbell Wrist Curl'),
  ('Cable Reverse Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','CABLE',array[]::text[],'Dumbbell Reverse Wrist Curl'),
  ('Cable High Row','WEIGHT_REPS','BACK','CABLE',array[]::text[],'Machine High Row'),
  ('Cable Low Row','WEIGHT_REPS','BACK','CABLE',array[]::text[],'Machine Low Row'),
  ('Barbell Split Squat','WEIGHT_REPS','QUADS','BARBELL',array[]::text[],'Dumbbell Split Squat'),
  ('Barbell Forward Lunge','WEIGHT_REPS','QUADS','BARBELL',array[]::text[],'Dumbbell Forward Lunge'),
  ('Barbell Lateral Lunge','WEIGHT_REPS','QUADS','BARBELL',array['Barbell Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Barbell Curtsy Lunge','WEIGHT_REPS','GLUTES','BARBELL',array['Barbell Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('JM Press','WEIGHT_REPS','TRICEPS','BARBELL',array['Barbell JM Press']::text[],'Close-Grip Barbell Bench Press'),
  ('Spoto Press','WEIGHT_REPS','CHEST','BARBELL',array['Barbell Spoto Press']::text[],'Barbell Bench Press'),
  ('Larsen Press','WEIGHT_REPS','CHEST','BARBELL',array['Barbell Larsen Press']::text[],'Barbell Bench Press'),
  ('Paused Barbell Bench Press','WEIGHT_REPS','CHEST','BARBELL',array['Paused Bench Press']::text[],'Barbell Bench Press'),
  ('Pin Bench Press','WEIGHT_REPS','CHEST','BARBELL',array['Barbell Pin Press']::text[],'Barbell Bench Press'),
  ('Board Press','WEIGHT_REPS','CHEST','BARBELL',array['Barbell Board Press']::text[],'Barbell Bench Press'),
  ('Seal Row','WEIGHT_REPS','BACK','BARBELL',array['Barbell Seal Row']::text[],'Chest-Supported Dumbbell Row'),
  ('Chest-Supported Barbell Row','WEIGHT_REPS','BACK','BARBELL',array['Barbell Chest-Supported Row']::text[],'Chest-Supported Dumbbell Row'),
  ('Barbell Upright Row','WEIGHT_REPS','SHOULDERS','BARBELL',array[]::text[],'Dumbbell Upright Row'),
  ('Bradford Press','WEIGHT_REPS','SHOULDERS','BARBELL',array['Barbell Bradford Press']::text[],'Overhead Press'),
  ('Reverse-Grip Barbell Bench Press','WEIGHT_REPS','CHEST','BARBELL',array['Reverse Grip Bench Press']::text[],'Barbell Bench Press'),
  ('Barbell Sumo Squat','WEIGHT_REPS','QUADS','BARBELL',array[]::text[],'Dumbbell Sumo Squat'),
  ('Barbell Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','BARBELL',array[]::text[],'Dumbbell Wrist Curl'),
  ('Barbell Reverse Wrist Curl','WEIGHT_REPS','FOREARMS_GRIP','BARBELL',array[]::text[],'Dumbbell Reverse Wrist Curl'),
  ('Barbell B-Stance Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','BARBELL',array['Barbell Kickstand RDL','B-Stance Barbell RDL']::text[],'Dumbbell Kickstand Romanian Deadlift'),
  ('Barbell B-Stance Hip Thrust','WEIGHT_REPS','GLUTES','BARBELL',array['B-Stance Barbell Hip Thrust']::text[],'Barbell Hip Thrust'),
  ('Bodyweight Forward Lunge','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Forward Lunge']::text[],'Dumbbell Forward Lunge'),
  ('Bodyweight Lateral Lunge','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Bodyweight Side Lunge','Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Bodyweight Curtsy Lunge','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Curtsy Lunge','Curtsy Squat','Bodyweight Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('Reverse Crunch','BODYWEIGHT_REPS','CORE','BODYWEIGHT',array[]::text[],'Crunch'),
  ('V-Up','BODYWEIGHT_REPS','CORE','BODYWEIGHT',array['V Up','V-Sit Up']::text[],'Sit-Up'),
  ('Lying Leg Raise','BODYWEIGHT_REPS','CORE','BODYWEIGHT',array['Floor Leg Raise']::text[],'Hanging Leg Raise'),
  ('Dragon Flag','BODYWEIGHT_REPS','CORE','BODYWEIGHT',array[]::text[],'Hanging Leg Raise'),
  ('Archer Push-Up','BODYWEIGHT_REPS','CHEST','BODYWEIGHT',array['Archer Pushup']::text[],'Push-Up'),
  ('One-Arm Push-Up','BODYWEIGHT_REPS','CHEST','BODYWEIGHT',array['One Arm Push-Up','Single-Arm Push-Up']::text[],'Push-Up'),
  ('Archer Pull-Up','BODYWEIGHT_REPS','BACK','BODYWEIGHT',array['Archer Pullup']::text[],'Pull-Up'),
  ('Sternum Pull-Up','BODYWEIGHT_REPS','BACK','BODYWEIGHT',array['Gironda Pull-Up','Sternum Pullup']::text[],'Pull-Up'),
  ('Hindu Push-Up','BODYWEIGHT_REPS','CHEST','BODYWEIGHT',array['Hindu Pushup']::text[],'Push-Up'),
  ('Pseudo Planche Push-Up','BODYWEIGHT_REPS','SHOULDERS','BODYWEIGHT',array['Pseudo Planche Pushup']::text[],'Pike Push-Up'),
  ('Bench Dip','BODYWEIGHT_REPS','TRICEPS','BODYWEIGHT',array['Bench Triceps Dip']::text[],'Dip'),
  ('Step-Down','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Step Down']::text[],'Bodyweight Step-Up'),
  ('Single-Leg Sit-to-Stand','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Single Leg Sit to Stand','Single-Leg Chair Squat']::text[],'Pistol Squat'),
  ('Frog Pump','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Bodyweight Frog Pump']::text[],'Dumbbell Frog Pump'),
  ('Donkey Kick','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Bodyweight Donkey Kick']::text[],'Machine Glute Kickback'),
  ('Fire Hydrant','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Quadruped Hip Abduction']::text[],'Cable Hip Abduction'),
  ('Side-Lying Hip Abduction','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Side Lying Leg Raise']::text[],'Cable Hip Abduction'),
  ('Single-Leg Hip Thrust','BODYWEIGHT_REPS','GLUTES','BODYWEIGHT',array['Single Leg Hip Thrust']::text[],'Bodyweight Hip Thrust'),
  ('Heel-Elevated Bodyweight Squat','BODYWEIGHT_REPS','QUADS','BODYWEIGHT',array['Bodyweight Heels-Elevated Squat','Bodyweight Cyclist Squat']::text[],'Bodyweight Squat'),
  ('Kettlebell Bulgarian Split Squat','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Bulgarian Split Squat']::text[],'Dumbbell Bulgarian Split Squat'),
  ('Kettlebell Reverse Lunge','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Reverse Lunge']::text[],'Dumbbell Reverse Lunge'),
  ('Kettlebell Walking Lunge','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Walking Lunge']::text[],'Dumbbell Walking Lunge'),
  ('Kettlebell Curtsy Lunge','WEIGHT_REPS','GLUTES','KETTLEBELL',array['KB Curtsy Lunge','Kettlebell Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('Kettlebell Lateral Lunge','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Lateral Lunge','Kettlebell Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Kettlebell Sumo Squat','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Sumo Squat']::text[],'Dumbbell Sumo Squat'),
  ('Double Kettlebell Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','KETTLEBELL',array['Double KB RDL']::text[],'Kettlebell Romanian Deadlift'),
  ('Double Kettlebell Deadlift','WEIGHT_REPS','HAMSTRINGS','KETTLEBELL',array['Double KB Deadlift']::text[],'Kettlebell Deadlift'),
  ('Double Kettlebell Strict Press','WEIGHT_REPS','SHOULDERS','KETTLEBELL',array['Double KB Strict Press']::text[],'Kettlebell Strict Press'),
  ('Double Kettlebell Bent-Over Row','WEIGHT_REPS','BACK','KETTLEBELL',array['Double KB Bent-Over Row']::text[],'Kettlebell Bent-Over Row'),
  ('Kettlebell Biceps Curl','WEIGHT_REPS','BICEPS','KETTLEBELL',array['KB Biceps Curl']::text[],'Dumbbell Biceps Curl'),
  ('Kettlebell Triceps Extension','WEIGHT_REPS','TRICEPS','KETTLEBELL',array['KB Triceps Extension']::text[],'Dumbbell Triceps Extension'),
  ('Kettlebell Calf Raise','WEIGHT_REPS','CALVES','KETTLEBELL',array['KB Calf Raise']::text[],'Dumbbell Calf Raise'),
  ('Kettlebell Step-Up','WEIGHT_REPS','QUADS','KETTLEBELL',array['KB Step-Up']::text[],'Dumbbell Step-Up'),
  ('Kettlebell Hip Thrust','WEIGHT_REPS','GLUTES','KETTLEBELL',array['KB Hip Thrust']::text[],'Dumbbell Hip Thrust'),
  ('Kettlebell Glute Bridge','WEIGHT_REPS','GLUTES','KETTLEBELL',array['KB Glute Bridge']::text[],'Dumbbell Glute Bridge'),
  ('Kettlebell Lateral Raise','WEIGHT_REPS','SHOULDERS','KETTLEBELL',array['KB Lateral Raise']::text[],'Dumbbell Lateral Raise'),
  ('Kettlebell Front Raise','WEIGHT_REPS','SHOULDERS','KETTLEBELL',array['KB Front Raise']::text[],'Dumbbell Front Raise'),
  ('Kettlebell Shrug','WEIGHT_REPS','BACK','KETTLEBELL',array['KB Shrug']::text[],'Dumbbell Shrug'),
  ('Kettlebell Chest-Supported Row','WEIGHT_REPS','BACK','KETTLEBELL',array['KB Chest-Supported Row']::text[],'Chest-Supported Dumbbell Row'),
  ('Landmine Split Squat','WEIGHT_REPS','QUADS','LANDMINE',array[]::text[],'Dumbbell Split Squat'),
  ('Landmine Bulgarian Split Squat','WEIGHT_REPS','QUADS','LANDMINE',array[]::text[],'Dumbbell Bulgarian Split Squat'),
  ('Landmine Lateral Lunge','WEIGHT_REPS','QUADS','LANDMINE',array['Landmine Side Lunge']::text[],'Dumbbell Lateral Lunge'),
  ('Landmine Curtsy Lunge','WEIGHT_REPS','GLUTES','LANDMINE',array['Landmine Curtsy Squat']::text[],'Dumbbell Curtsy Lunge'),
  ('Landmine Calf Raise','WEIGHT_REPS','CALVES','LANDMINE',array[]::text[],'Barbell Calf Raise'),
  ('Landmine Single-Leg Romanian Deadlift','WEIGHT_REPS','HAMSTRINGS','LANDMINE',array['Landmine Single-Leg RDL']::text[],'Dumbbell Single-Leg Romanian Deadlift'),
  ('Landmine High Row','WEIGHT_REPS','BACK','LANDMINE',array[]::text[],'Dumbbell High Row'),
  ('Glute Ham Raise','BODYWEIGHT_REPS','HAMSTRINGS','SPECIALTY',array['GHR','Glute-Ham Raise']::text[],'Nordic Hamstring Curl'),
  ('45-Degree Hip Extension','BODYWEIGHT_REPS','GLUTES','SPECIALTY',array['45 Degree Hip Extension','45-Degree Glute Extension']::text[],'GHD Hip Extension'),
  ('Single-Leg 45-Degree Hip Extension','BODYWEIGHT_REPS','GLUTES','SPECIALTY',array['Single Leg 45 Degree Hip Extension']::text[],'GHD Hip Extension')
)
insert into public.muscle_volume_exercise_contributions
  (methodology_version,exercise_id,muscle_group,contribution_role,contribution_weight)
select
  'muscle-volume-v1',
  e.id,
  tc.muscle_group,
  tc.contribution_role,
  tc.contribution_weight
from additions a
join public.exercise_catalog e on e.canonical_name = a.canonical_name
join public.exercise_catalog t on t.canonical_name = a.template_name
join public.muscle_volume_exercise_contributions tc
  on tc.exercise_id = t.id and tc.methodology_version = 'muscle-volume-v1'
where a.template_name is not null;

-- All rep-based plyometrics remain explicitly excluded from hypertrophy volume v1.
update public.muscle_volume_exercise_rules r
set volume_eligible = false,
    set_quality_mode = 'NONE',
    mapping_confidence = 'HIGH',
    review_flag = true,
    rationale = 'Plyometric/ballistic movement is trackable by repetitions and optional added load, but remains excluded from muscle-volume-v1 because the current hypertrophy set-stimulus model is not calibrated for explosive contacts.'
from public.exercise_catalog e
where r.exercise_id = e.id
  and r.methodology_version = 'muscle-volume-v1'
  and e.active = true
  and e.workout_type = 'PLYOMETRIC'
  and e.measurement_type = 'BODYWEIGHT_REPS';

delete from public.muscle_volume_exercise_contributions c
using public.exercise_catalog e
where c.exercise_id = e.id
  and c.methodology_version = 'muscle-volume-v1'
  and e.active = true
  and e.workout_type = 'PLYOMETRIC';

do $$
declare
  v_new_count bigint;
  v_unmapped bigint;
begin
  select count(*) into v_new_count
  from public.exercise_catalog
  where active = true and canonical_name = any(array['180-Degree Squat Jump','Kneeling Jump','Seated Box Jump','Lateral Box Jump','Single-Leg Box Jump','Jumping Bulgarian Split Squat','Depth Push-Up','Explosive Push-Up to Box','Plyometric Pull-Up','Frog Jump','Lateral Pogo Jump','Single-Leg Pogo Jump','Egyptian Cable Lateral Raise','Single-Arm Cable Biceps Curl','Cable Preacher Curl','Cable Spider Curl','Cable Reverse Curl','Cable Upright Row','Cable Shrug','Cable Romanian Deadlift','Cable Squat','Cable Reverse Lunge','Cable Lateral Lunge','Cable Curtsy Lunge','Cable Leg Curl','Single-Arm Cable Chest Fly','Single-Arm Cable Chest Press','Cable Rear Delt Row','Cable Wrist Curl','Cable Reverse Wrist Curl','Cable High Row','Cable Low Row','Barbell Split Squat','Barbell Forward Lunge','Barbell Lateral Lunge','Barbell Curtsy Lunge','JM Press','Spoto Press','Larsen Press','Paused Barbell Bench Press','Pin Bench Press','Board Press','Seal Row','Chest-Supported Barbell Row','Barbell Upright Row','Bradford Press','Reverse-Grip Barbell Bench Press','Barbell Sumo Squat','Barbell Wrist Curl','Barbell Reverse Wrist Curl','Barbell B-Stance Romanian Deadlift','Barbell B-Stance Hip Thrust','Bodyweight Forward Lunge','Bodyweight Lateral Lunge','Bodyweight Curtsy Lunge','Reverse Crunch','V-Up','Lying Leg Raise','Dragon Flag','Archer Push-Up','One-Arm Push-Up','Archer Pull-Up','Sternum Pull-Up','Hindu Push-Up','Pseudo Planche Push-Up','Bench Dip','Step-Down','Single-Leg Sit-to-Stand','Frog Pump','Donkey Kick','Fire Hydrant','Side-Lying Hip Abduction','Single-Leg Hip Thrust','Heel-Elevated Bodyweight Squat','Kettlebell Bulgarian Split Squat','Kettlebell Reverse Lunge','Kettlebell Walking Lunge','Kettlebell Curtsy Lunge','Kettlebell Lateral Lunge','Kettlebell Sumo Squat','Double Kettlebell Romanian Deadlift','Double Kettlebell Deadlift','Double Kettlebell Strict Press','Double Kettlebell Bent-Over Row','Kettlebell Biceps Curl','Kettlebell Triceps Extension','Kettlebell Calf Raise','Kettlebell Step-Up','Kettlebell Hip Thrust','Kettlebell Glute Bridge','Kettlebell Lateral Raise','Kettlebell Front Raise','Kettlebell Shrug','Kettlebell Chest-Supported Row','Landmine Split Squat','Landmine Bulgarian Split Squat','Landmine Lateral Lunge','Landmine Curtsy Lunge','Landmine Calf Raise','Landmine Single-Leg Romanian Deadlift','Landmine High Row','Glute Ham Raise','45-Degree Hip Extension','Single-Leg 45-Degree Hip Extension']::text[]);
  if v_new_count <> 104 then
    raise exception 'Phase 19.3B expected all 104 reconciliation exercises; found %', v_new_count;
  end if;

  if (select count(*) from public.exercise_catalog where active = true) < 568 then
    raise exception 'Phase 19.3B expected at least 568 active exercises after reconciliation';
  end if;

  select count(*) into v_unmapped
  from public.exercise_catalog e
  left join public.muscle_volume_exercise_rules r
    on r.exercise_id = e.id and r.methodology_version = 'muscle-volume-v1'
  where e.active = true and r.exercise_id is null;
  if v_unmapped <> 0 then
    raise exception 'Phase 19.3B left % active exercises without a muscle-volume-v1 rule', v_unmapped;
  end if;
end
$$;
