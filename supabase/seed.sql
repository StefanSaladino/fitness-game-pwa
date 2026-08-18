-- Fitness Game PWA — expanded canonical exercise catalogue
-- Compatible with Phase 4 exercise_catalog schema.
-- Idempotent: safe to run again. Existing canonical rows are refreshed
-- to the measurement type defined here and reactivated.

begin;

-- BARBELL & FREE-WEIGHT COMPOUNDS
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Barbell Bench Press', 'WEIGHT_REPS', true),
  ('Incline Barbell Bench Press', 'WEIGHT_REPS', true),
  ('Decline Barbell Bench Press', 'WEIGHT_REPS', true),
  ('Close-Grip Barbell Bench Press', 'WEIGHT_REPS', true),
  ('Barbell Floor Press', 'WEIGHT_REPS', true),
  ('Overhead Press', 'WEIGHT_REPS', true),
  ('Push Press', 'WEIGHT_REPS', true),
  ('Barbell Front Raise', 'WEIGHT_REPS', true),
  ('Back Squat', 'WEIGHT_REPS', true),
  ('Front Squat', 'WEIGHT_REPS', true),
  ('Zercher Squat', 'WEIGHT_REPS', true),
  ('Box Squat', 'WEIGHT_REPS', true),
  ('Pause Squat', 'WEIGHT_REPS', true),
  ('Barbell Hack Squat', 'WEIGHT_REPS', true),
  ('Jefferson Squat', 'WEIGHT_REPS', true),
  ('Deadlift', 'WEIGHT_REPS', true),
  ('Sumo Deadlift', 'WEIGHT_REPS', true),
  ('Romanian Deadlift', 'WEIGHT_REPS', true),
  ('Stiff-Leg Deadlift', 'WEIGHT_REPS', true),
  ('Deficit Deadlift', 'WEIGHT_REPS', true),
  ('Rack Pull', 'WEIGHT_REPS', true),
  ('Snatch-Grip Deadlift', 'WEIGHT_REPS', true),
  ('Good Morning', 'WEIGHT_REPS', true),
  ('Barbell Row', 'WEIGHT_REPS', true),
  ('Pendlay Row', 'WEIGHT_REPS', true),
  ('Barbell Shrug', 'WEIGHT_REPS', true),
  ('Barbell Hip Thrust', 'WEIGHT_REPS', true),
  ('Barbell Glute Bridge', 'WEIGHT_REPS', true),
  ('Barbell Reverse Lunge', 'WEIGHT_REPS', true),
  ('Barbell Walking Lunge', 'WEIGHT_REPS', true),
  ('Barbell Bulgarian Split Squat', 'WEIGHT_REPS', true),
  ('Barbell Step-Up', 'WEIGHT_REPS', true),
  ('Barbell Calf Raise', 'WEIGHT_REPS', true),
  ('Barbell Biceps Curl', 'WEIGHT_REPS', true),
  ('Barbell Reverse Curl', 'WEIGHT_REPS', true),
  ('Biceps Curl', 'WEIGHT_REPS', true),
  ('EZ-Bar Curl', 'WEIGHT_REPS', true),
  ('EZ-Bar Skull Crusher', 'WEIGHT_REPS', true),
  ('Barbell Skull Crusher', 'WEIGHT_REPS', true),
  ('Triceps Extension', 'WEIGHT_REPS', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- OLYMPIC & POWER LIFTS
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Power Clean', 'WEIGHT_REPS', true),
  ('Hang Power Clean', 'WEIGHT_REPS', true),
  ('Clean', 'WEIGHT_REPS', true),
  ('Clean and Jerk', 'WEIGHT_REPS', true),
  ('Power Snatch', 'WEIGHT_REPS', true),
  ('Hang Power Snatch', 'WEIGHT_REPS', true),
  ('Snatch', 'WEIGHT_REPS', true),
  ('Clean Pull', 'WEIGHT_REPS', true),
  ('Snatch Pull', 'WEIGHT_REPS', true),
  ('High Pull', 'WEIGHT_REPS', true),
  ('Push Jerk', 'WEIGHT_REPS', true),
  ('Split Jerk', 'WEIGHT_REPS', true),
  ('Barbell Thruster', 'WEIGHT_REPS', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- DUMBBELLS
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Dumbbell Bench Press', 'WEIGHT_REPS', true),
  ('Incline Dumbbell Press', 'WEIGHT_REPS', true),
  ('Decline Dumbbell Press', 'WEIGHT_REPS', true),
  ('Dumbbell Floor Press', 'WEIGHT_REPS', true),
  ('Dumbbell Squeeze Press', 'WEIGHT_REPS', true),
  ('Dumbbell Fly', 'WEIGHT_REPS', true),
  ('Incline Dumbbell Fly', 'WEIGHT_REPS', true),
  ('Dumbbell Pullover', 'WEIGHT_REPS', true),
  ('Dumbbell Shoulder Press', 'WEIGHT_REPS', true),
  ('Arnold Press', 'WEIGHT_REPS', true),
  ('Dumbbell Push Press', 'WEIGHT_REPS', true),
  ('Dumbbell Lateral Raise', 'WEIGHT_REPS', true),
  ('Dumbbell Front Raise', 'WEIGHT_REPS', true),
  ('Dumbbell Reverse Fly', 'WEIGHT_REPS', true),
  ('Dumbbell Row', 'WEIGHT_REPS', true),
  ('Chest-Supported Dumbbell Row', 'WEIGHT_REPS', true),
  ('Dumbbell Renegade Row', 'WEIGHT_REPS', true),
  ('Dumbbell Shrug', 'WEIGHT_REPS', true),
  ('Dumbbell Biceps Curl', 'WEIGHT_REPS', true),
  ('Dumbbell Hammer Curl', 'WEIGHT_REPS', true),
  ('Incline Dumbbell Curl', 'WEIGHT_REPS', true),
  ('Concentration Curl', 'WEIGHT_REPS', true),
  ('Dumbbell Preacher Curl', 'WEIGHT_REPS', true),
  ('Dumbbell Triceps Extension', 'WEIGHT_REPS', true),
  ('Dumbbell Skull Crusher', 'WEIGHT_REPS', true),
  ('Dumbbell Triceps Kickback', 'WEIGHT_REPS', true),
  ('Goblet Squat', 'WEIGHT_REPS', true),
  ('Dumbbell Front Squat', 'WEIGHT_REPS', true),
  ('Dumbbell Romanian Deadlift', 'WEIGHT_REPS', true),
  ('Dumbbell Single-Leg Romanian Deadlift', 'WEIGHT_REPS', true),
  ('Dumbbell Reverse Lunge', 'WEIGHT_REPS', true),
  ('Dumbbell Walking Lunge', 'WEIGHT_REPS', true),
  ('Dumbbell Bulgarian Split Squat', 'WEIGHT_REPS', true),
  ('Dumbbell Step-Up', 'WEIGHT_REPS', true),
  ('Dumbbell Calf Raise', 'WEIGHT_REPS', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- KETTLEBELLS
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Kettlebell Swing', 'WEIGHT_REPS', true),
  ('Single-Arm Kettlebell Swing', 'WEIGHT_REPS', true),
  ('Kettlebell Goblet Squat', 'WEIGHT_REPS', true),
  ('Kettlebell Front Rack Squat', 'WEIGHT_REPS', true),
  ('Double Kettlebell Front Squat', 'WEIGHT_REPS', true),
  ('Kettlebell Deadlift', 'WEIGHT_REPS', true),
  ('Kettlebell Sumo Deadlift', 'WEIGHT_REPS', true),
  ('Kettlebell Romanian Deadlift', 'WEIGHT_REPS', true),
  ('Kettlebell Single-Leg Romanian Deadlift', 'WEIGHT_REPS', true),
  ('Kettlebell Clean', 'WEIGHT_REPS', true),
  ('Double Kettlebell Clean', 'WEIGHT_REPS', true),
  ('Kettlebell Snatch', 'WEIGHT_REPS', true),
  ('Kettlebell Strict Press', 'WEIGHT_REPS', true),
  ('Kettlebell Push Press', 'WEIGHT_REPS', true),
  ('Kettlebell Jerk', 'WEIGHT_REPS', true),
  ('Kettlebell Clean and Press', 'WEIGHT_REPS', true),
  ('Kettlebell Thruster', 'WEIGHT_REPS', true),
  ('Turkish Get-Up', 'WEIGHT_REPS', true),
  ('Kettlebell Windmill', 'WEIGHT_REPS', true),
  ('Kettlebell Halo', 'WEIGHT_REPS', true),
  ('Kettlebell High Pull', 'WEIGHT_REPS', true),
  ('Kettlebell Gorilla Row', 'WEIGHT_REPS', true),
  ('Kettlebell Bent-Over Row', 'WEIGHT_REPS', true),
  ('Kettlebell Renegade Row', 'WEIGHT_REPS', true),
  ('Kettlebell Floor Press', 'WEIGHT_REPS', true),
  ('Kettlebell Bottoms-Up Press', 'WEIGHT_REPS', true),
  ('Kettlebell Suitcase Deadlift', 'WEIGHT_REPS', true),
  ('Kettlebell Lunge', 'WEIGHT_REPS', true),
  ('Kettlebell Cossack Squat', 'WEIGHT_REPS', true),
  ('Kettlebell Farmer Carry', 'OTHER', true),
  ('Kettlebell Suitcase Carry', 'OTHER', true),
  ('Kettlebell Front Rack Carry', 'OTHER', true),
  ('Kettlebell Overhead Carry', 'OTHER', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- MACHINES & SMITH MACHINE
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Machine Chest Press', 'WEIGHT_REPS', true),
  ('Incline Machine Chest Press', 'WEIGHT_REPS', true),
  ('Pec Deck Fly', 'WEIGHT_REPS', true),
  ('Reverse Pec Deck Fly', 'WEIGHT_REPS', true),
  ('Machine Shoulder Press', 'WEIGHT_REPS', true),
  ('Machine Lateral Raise', 'WEIGHT_REPS', true),
  ('Lat Pulldown', 'WEIGHT_REPS', true),
  ('Close-Grip Lat Pulldown', 'WEIGHT_REPS', true),
  ('Machine Seated Row', 'WEIGHT_REPS', true),
  ('Machine High Row', 'WEIGHT_REPS', true),
  ('Machine Low Row', 'WEIGHT_REPS', true),
  ('Assisted Pull-Up', 'OTHER', true),
  ('Assisted Dip', 'OTHER', true),
  ('Leg Press', 'WEIGHT_REPS', true),
  ('Single-Leg Press', 'WEIGHT_REPS', true),
  ('Hack Squat Machine', 'WEIGHT_REPS', true),
  ('Pendulum Squat', 'WEIGHT_REPS', true),
  ('Belt Squat', 'WEIGHT_REPS', true),
  ('Leg Extension', 'WEIGHT_REPS', true),
  ('Single-Leg Extension', 'WEIGHT_REPS', true),
  ('Seated Leg Curl', 'WEIGHT_REPS', true),
  ('Lying Leg Curl', 'WEIGHT_REPS', true),
  ('Standing Leg Curl', 'WEIGHT_REPS', true),
  ('Hip Abduction Machine', 'WEIGHT_REPS', true),
  ('Hip Adduction Machine', 'WEIGHT_REPS', true),
  ('Glute Drive Machine', 'WEIGHT_REPS', true),
  ('Standing Calf Raise Machine', 'WEIGHT_REPS', true),
  ('Seated Calf Raise Machine', 'WEIGHT_REPS', true),
  ('Machine Preacher Curl', 'WEIGHT_REPS', true),
  ('Machine Biceps Curl', 'WEIGHT_REPS', true),
  ('Machine Triceps Extension', 'WEIGHT_REPS', true),
  ('Smith Machine Bench Press', 'WEIGHT_REPS', true),
  ('Smith Machine Incline Bench Press', 'WEIGHT_REPS', true),
  ('Smith Machine Squat', 'WEIGHT_REPS', true),
  ('Smith Machine Front Squat', 'WEIGHT_REPS', true),
  ('Smith Machine Romanian Deadlift', 'WEIGHT_REPS', true),
  ('Smith Machine Bulgarian Split Squat', 'WEIGHT_REPS', true),
  ('Smith Machine Hip Thrust', 'WEIGHT_REPS', true),
  ('Smith Machine Calf Raise', 'WEIGHT_REPS', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- CABLES
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Cable Chest Fly', 'WEIGHT_REPS', true),
  ('Low-to-High Cable Fly', 'WEIGHT_REPS', true),
  ('High-to-Low Cable Fly', 'WEIGHT_REPS', true),
  ('Cable Crossover', 'WEIGHT_REPS', true),
  ('Cable Chest Press', 'WEIGHT_REPS', true),
  ('Seated Cable Row', 'WEIGHT_REPS', true),
  ('Single-Arm Cable Row', 'WEIGHT_REPS', true),
  ('Cable Face Pull', 'WEIGHT_REPS', true),
  ('Straight-Arm Pulldown', 'WEIGHT_REPS', true),
  ('Cable Pullover', 'WEIGHT_REPS', true),
  ('Cable Lateral Raise', 'WEIGHT_REPS', true),
  ('Cable Front Raise', 'WEIGHT_REPS', true),
  ('Cable Reverse Fly', 'WEIGHT_REPS', true),
  ('Cable Y-Raise', 'WEIGHT_REPS', true),
  ('Cable Biceps Curl', 'WEIGHT_REPS', true),
  ('Bayesian Cable Curl', 'WEIGHT_REPS', true),
  ('Rope Hammer Curl', 'WEIGHT_REPS', true),
  ('Cable Triceps Pushdown', 'WEIGHT_REPS', true),
  ('Rope Triceps Pushdown', 'WEIGHT_REPS', true),
  ('Overhead Cable Triceps Extension', 'WEIGHT_REPS', true),
  ('Single-Arm Cable Triceps Extension', 'WEIGHT_REPS', true),
  ('Cable Triceps Kickback', 'WEIGHT_REPS', true),
  ('Cable Crunch', 'WEIGHT_REPS', true),
  ('Pallof Press', 'WEIGHT_REPS', true),
  ('Cable Wood Chop', 'WEIGHT_REPS', true),
  ('Cable Reverse Wood Chop', 'WEIGHT_REPS', true),
  ('Cable Pull-Through', 'WEIGHT_REPS', true),
  ('Cable Hip Abduction', 'WEIGHT_REPS', true),
  ('Cable Hip Adduction', 'WEIGHT_REPS', true),
  ('Cable Glute Kickback', 'WEIGHT_REPS', true),
  ('Cable External Rotation', 'WEIGHT_REPS', true),
  ('Cable Internal Rotation', 'WEIGHT_REPS', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- CALISTHENICS & BODYWEIGHT
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Pull-Up', 'BODYWEIGHT_REPS', true),
  ('Chin-Up', 'BODYWEIGHT_REPS', true),
  ('Neutral-Grip Pull-Up', 'BODYWEIGHT_REPS', true),
  ('Wide-Grip Pull-Up', 'BODYWEIGHT_REPS', true),
  ('Commando Pull-Up', 'BODYWEIGHT_REPS', true),
  ('Scapular Pull-Up', 'BODYWEIGHT_REPS', true),
  ('Muscle-Up', 'BODYWEIGHT_REPS', true),
  ('Inverted Row', 'BODYWEIGHT_REPS', true),
  ('Ring Row', 'BODYWEIGHT_REPS', true),
  ('Push-Up', 'BODYWEIGHT_REPS', true),
  ('Incline Push-Up', 'BODYWEIGHT_REPS', true),
  ('Decline Push-Up', 'BODYWEIGHT_REPS', true),
  ('Diamond Push-Up', 'BODYWEIGHT_REPS', true),
  ('Wide-Grip Push-Up', 'BODYWEIGHT_REPS', true),
  ('Pike Push-Up', 'BODYWEIGHT_REPS', true),
  ('Handstand Push-Up', 'BODYWEIGHT_REPS', true),
  ('Ring Push-Up', 'BODYWEIGHT_REPS', true),
  ('Scapular Push-Up', 'BODYWEIGHT_REPS', true),
  ('Dip', 'BODYWEIGHT_REPS', true),
  ('Ring Dip', 'BODYWEIGHT_REPS', true),
  ('Bodyweight Squat', 'BODYWEIGHT_REPS', true),
  ('Bodyweight Split Squat', 'BODYWEIGHT_REPS', true),
  ('Bodyweight Bulgarian Split Squat', 'BODYWEIGHT_REPS', true),
  ('Bodyweight Reverse Lunge', 'BODYWEIGHT_REPS', true),
  ('Bodyweight Walking Lunge', 'BODYWEIGHT_REPS', true),
  ('Bodyweight Step-Up', 'BODYWEIGHT_REPS', true),
  ('Pistol Squat', 'BODYWEIGHT_REPS', true),
  ('Shrimp Squat', 'BODYWEIGHT_REPS', true),
  ('Sissy Squat', 'BODYWEIGHT_REPS', true),
  ('Cossack Squat', 'BODYWEIGHT_REPS', true),
  ('Nordic Hamstring Curl', 'BODYWEIGHT_REPS', true),
  ('Reverse Nordic Curl', 'BODYWEIGHT_REPS', true),
  ('Glute Bridge', 'BODYWEIGHT_REPS', true),
  ('Single-Leg Glute Bridge', 'BODYWEIGHT_REPS', true),
  ('Bodyweight Hip Thrust', 'BODYWEIGHT_REPS', true),
  ('Calf Raise', 'BODYWEIGHT_REPS', true),
  ('Single-Leg Calf Raise', 'BODYWEIGHT_REPS', true),
  ('Hanging Leg Raise', 'BODYWEIGHT_REPS', true),
  ('Hanging Knee Raise', 'BODYWEIGHT_REPS', true),
  ('Toes-to-Bar', 'BODYWEIGHT_REPS', true),
  ('Sit-Up', 'BODYWEIGHT_REPS', true),
  ('Crunch', 'BODYWEIGHT_REPS', true),
  ('Bicycle Crunch', 'BODYWEIGHT_REPS', true),
  ('Dead Bug', 'BODYWEIGHT_REPS', true),
  ('Bird Dog', 'BODYWEIGHT_REPS', true),
  ('Ab Wheel Rollout', 'BODYWEIGHT_REPS', true),
  ('Mountain Climber', 'BODYWEIGHT_REPS', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- ISOMETRICS & CORE HOLDS
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Front Plank', 'DURATION', true),
  ('Side Plank', 'DURATION', true),
  ('Copenhagen Plank', 'DURATION', true),
  ('Hollow Body Hold', 'DURATION', true),
  ('Superman Hold', 'DURATION', true),
  ('Wall Sit', 'DURATION', true),
  ('L-Sit', 'DURATION', true),
  ('Dead Hang', 'DURATION', true),
  ('Flexed-Arm Hang', 'DURATION', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- PLYOMETRICS & EXPLOSIVE BODYWEIGHT
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Box Jump', 'OTHER', true),
  ('Depth Jump', 'OTHER', true),
  ('Drop Jump', 'OTHER', true),
  ('Broad Jump', 'OTHER', true),
  ('Vertical Jump', 'OTHER', true),
  ('Tuck Jump', 'OTHER', true),
  ('Squat Jump', 'OTHER', true),
  ('Split Squat Jump', 'OTHER', true),
  ('Jumping Lunge', 'OTHER', true),
  ('Skater Jump', 'OTHER', true),
  ('Lateral Bound', 'OTHER', true),
  ('Single-Leg Broad Jump', 'OTHER', true),
  ('Pogo Jump', 'OTHER', true),
  ('Hurdle Hop', 'OTHER', true),
  ('Lateral Hurdle Hop', 'OTHER', true),
  ('Bounds', 'OTHER', true),
  ('Power Skip', 'OTHER', true),
  ('Burpee', 'OTHER', true),
  ('Burpee Box Jump', 'OTHER', true),
  ('Clap Push-Up', 'OTHER', true),
  ('Plyometric Push-Up', 'OTHER', true),
  ('Jump Rope', 'DURATION', true),
  ('Double-Under', 'OTHER', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- MEDICINE BALL
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Medicine Ball Chest Pass', 'OTHER', true),
  ('Medicine Ball Overhead Throw', 'OTHER', true),
  ('Medicine Ball Slam', 'OTHER', true),
  ('Medicine Ball Rotational Throw', 'OTHER', true),
  ('Medicine Ball Scoop Toss', 'OTHER', true),
  ('Medicine Ball Shot-Put Throw', 'OTHER', true),
  ('Medicine Ball Sit-Up Throw', 'OTHER', true),
  ('Medicine Ball Russian Twist', 'OTHER', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- LANDMINE
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Landmine Press', 'WEIGHT_REPS', true),
  ('Single-Arm Landmine Press', 'WEIGHT_REPS', true),
  ('Half-Kneeling Landmine Press', 'WEIGHT_REPS', true),
  ('Landmine Squat', 'WEIGHT_REPS', true),
  ('Landmine Hack Squat', 'WEIGHT_REPS', true),
  ('Landmine Romanian Deadlift', 'WEIGHT_REPS', true),
  ('Landmine Row', 'WEIGHT_REPS', true),
  ('Meadows Row', 'WEIGHT_REPS', true),
  ('Landmine Reverse Lunge', 'WEIGHT_REPS', true),
  ('Landmine Thruster', 'WEIGHT_REPS', true),
  ('Landmine Rotation', 'WEIGHT_REPS', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- BANDS & LIGHT RESISTANCE
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Band Pull-Apart', 'OTHER', true),
  ('Band Face Pull', 'OTHER', true),
  ('Band Row', 'OTHER', true),
  ('Band Chest Press', 'OTHER', true),
  ('Band-Resisted Push-Up', 'OTHER', true),
  ('Band Overhead Press', 'OTHER', true),
  ('Band Lateral Raise', 'OTHER', true),
  ('Band Biceps Curl', 'OTHER', true),
  ('Band Triceps Extension', 'OTHER', true),
  ('Band Squat', 'OTHER', true),
  ('Band Good Morning', 'OTHER', true),
  ('Band Lateral Walk', 'OTHER', true),
  ('Band Monster Walk', 'OTHER', true),
  ('Band External Rotation', 'OTHER', true),
  ('Band Internal Rotation', 'OTHER', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- STRONGMAN, CARRIES & SLEDS
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Farmer Carry', 'OTHER', true),
  ('Suitcase Carry', 'OTHER', true),
  ('Front Rack Carry', 'OTHER', true),
  ('Overhead Carry', 'OTHER', true),
  ('Yoke Walk', 'OTHER', true),
  ('Zercher Carry', 'OTHER', true),
  ('Bear Hug Carry', 'OTHER', true),
  ('Sandbag Carry', 'OTHER', true),
  ('Sled Push', 'OTHER', true),
  ('Sled Pull', 'OTHER', true),
  ('Prowler Push', 'OTHER', true),
  ('Backward Sled Drag', 'OTHER', true),
  ('Tire Flip', 'WEIGHT_REPS', true),
  ('Sandbag Clean', 'WEIGHT_REPS', true),
  ('Sandbag Squat', 'WEIGHT_REPS', true),
  ('Sandbag Shouldering', 'WEIGHT_REPS', true),
  ('Atlas Stone Load', 'WEIGHT_REPS', true),
  ('Log Press', 'WEIGHT_REPS', true),
  ('Axle Deadlift', 'WEIGHT_REPS', true),
  ('Viking Press', 'WEIGHT_REPS', true),
  ('Rope Climb', 'BODYWEIGHT_REPS', true),
  ('Battle Ropes', 'DURATION', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

-- SPECIALTY, REHAB & ACCESSORIES
insert into public.exercise_catalog (canonical_name, measurement_type, active) values
  ('Trap Bar Deadlift', 'WEIGHT_REPS', true),
  ('Trap Bar Shrug', 'WEIGHT_REPS', true),
  ('Trap Bar Farmer Carry', 'OTHER', true),
  ('Safety Bar Squat', 'WEIGHT_REPS', true),
  ('Cambered Bar Squat', 'WEIGHT_REPS', true),
  ('Swiss Bar Bench Press', 'WEIGHT_REPS', true),
  ('Floor Skull Crusher', 'WEIGHT_REPS', true),
  ('Jefferson Curl', 'WEIGHT_REPS', true),
  ('Reverse Hyperextension', 'WEIGHT_REPS', true),
  ('45-Degree Back Extension', 'WEIGHT_REPS', true),
  ('Back Extension', 'BODYWEIGHT_REPS', true),
  ('GHD Hip Extension', 'BODYWEIGHT_REPS', true),
  ('GHD Sit-Up', 'BODYWEIGHT_REPS', true),
  ('Tibialis Raise', 'BODYWEIGHT_REPS', true),
  ('Weighted Tibialis Raise', 'WEIGHT_REPS', true),
  ('Soleus Raise', 'WEIGHT_REPS', true),
  ('Hip Airplane', 'BODYWEIGHT_REPS', true),
  ('Prone Y-Raise', 'BODYWEIGHT_REPS', true),
  ('Prone T-Raise', 'BODYWEIGHT_REPS', true),
  ('Prone W-Raise', 'BODYWEIGHT_REPS', true),
  ('Serratus Wall Slide', 'BODYWEIGHT_REPS', true),
  ('Spanish Squat Hold', 'DURATION', true),
  ('Reverse Sled Drag', 'OTHER', true),
  ('Neck Flexion', 'WEIGHT_REPS', true),
  ('Neck Extension', 'WEIGHT_REPS', true),
  ('Wrist Curl', 'WEIGHT_REPS', true),
  ('Reverse Wrist Curl', 'WEIGHT_REPS', true),
  ('Plate Pinch Hold', 'DURATION', true),
  ('Grip Trainer Squeeze', 'BODYWEIGHT_REPS', true)
on conflict (canonical_name) do update
set measurement_type = excluded.measurement_type,
    active = true;

commit;

-- Verification summary
select measurement_type, count(*) as exercise_count
from public.exercise_catalog
where active = true
group by measurement_type
order by measurement_type;

select count(*) as total_active_exercises
from public.exercise_catalog
where active = true;