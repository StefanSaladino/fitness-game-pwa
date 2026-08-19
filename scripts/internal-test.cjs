const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'fitness-game-domain-'));

const domainSources = [
  'src/domain/config.ts',
  'src/domain/types.ts',
  'src/domain/workouts/qualification.ts',
  'src/domain/scoring/baseXp.ts',
  'src/domain/scoring/exerciseXp.ts',
  'src/domain/scoring/cardioBonus.ts',
  'src/domain/scoring/dailyXp.ts',
  'src/domain/progression/benchmarks.ts',
  'src/domain/progression/performance.ts',
  'src/domain/consistency/weekly.ts',
];

function compileDomain() {
  const compilerArgs = [
    '--target', 'ES2022',
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--outDir', out,
    ...domainSources,
  ];

  // Prefer the project's own TypeScript dependency so this validation uses
  // the same compiler version as npm run typecheck on every operating system.
  const localTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');
  let result;

  if (fs.existsSync(localTsc)) {
    result = spawnSync(process.execPath, [localTsc, ...compilerArgs], {
      cwd: root,
      stdio: 'inherit',
    });
  } else {
    // Useful for minimal CI/packaging environments. On Windows shell=true
    // allows resolution of tsc.cmd; POSIX environments resolve tsc directly.
    result = spawnSync('tsc', compilerArgs, {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
  }

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Internal domain compilation failed with exit code ${result.status}.`);
  }

  // The repository itself is type=module. Keep the temporary output explicitly
  // CommonJS so require() semantics are deterministic regardless of temp path.
  fs.writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}\n');
}

function runAssertions() {
  const qualification = require(path.join(out, 'workouts/qualification.js'));
  const baseXp = require(path.join(out, 'scoring/baseXp.js'));
  const exerciseXp = require(path.join(out, 'scoring/exerciseXp.js'));
  const cardio = require(path.join(out, 'scoring/cardioBonus.js'));
  const dailyXp = require(path.join(out, 'scoring/dailyXp.js'));
  const benchmarks = require(path.join(out, 'progression/benchmarks.js'));
  const progression = require(path.join(out, 'progression/performance.js'));
  const weekly = require(path.join(out, 'consistency/weekly.js'));

  const strengthWorkout = (overrides = {}) => ({
    category: 'STRENGTH', status: 'COMPLETED', source: 'IN_APP', activeDurationSeconds: 900, ...overrides,
  });
  const cardioWorkout = (seconds, category = 'RUNNING') => ({
    category, status: 'COMPLETED', source: 'IN_APP', activeDurationSeconds: seconds,
  });
  const workingSets = (n, weightKg = 20) => Array.from({ length: n }, () => ({
    setType: 'WORKING', completed: true, reps: 8, weightKg,
  }));

  let assertions = 0;
  const check = (actual, expected, label) => {
    assert.deepEqual(actual, expected, label);
    assertions += 1;
  };
  const close = (actual, expected, label) => {
    assert.ok(Math.abs(actual - expected) < 1e-10, `${label}: ${actual} != ${expected}`);
    assertions += 1;
  };

  check(qualification.qualifiesLiftingWorkout(strengthWorkout({strengthSets:workingSets(4)})), true, 'lifting exact boundary');
  check(qualification.qualifiesLiftingWorkout(strengthWorkout({activeDurationSeconds:899,strengthSets:workingSets(4)})), false, 'lifting time boundary');
  check(qualification.qualifiesLiftingWorkout(strengthWorkout({strengthSets:workingSets(3)})), false, 'lifting set boundary');
  check(qualification.qualifiesLiftingWorkout(cardioWorkout(3600)), false, 'cardio is not lifting');

  for (const [category, threshold] of Object.entries({RUNNING:900,WALKING_HIKING:1800,CYCLING:1200,SWIMMING:900,SPORT:1200,CARDIO:1200,HIIT:720})) {
    check(qualification.qualifiesCardioBonusActivity(cardioWorkout(threshold - 1, category)), false, `${category} below cardio minimum`);
    check(qualification.qualifiesCardioBonusActivity(cardioWorkout(threshold, category)), true, `${category} at cardio minimum`);
  }
  check(qualification.qualifiesCardioBonusActivity(cardioWorkout(3600,'MOBILITY')), false, 'mobility no cardio bonus');
  check(qualification.qualifiesCardioBonusActivity(cardioWorkout(3600,'OTHER')), false, 'other no cardio bonus');

  check(baseXp.calculateDailyLiftingWorkoutXp(0), 0, 'zero lifting workouts');
  for (const n of [1,2,5,100]) check(baseXp.calculateDailyLiftingWorkoutXp(n), 50, `lifting daily base ${n}`);

  check(exerciseXp.calculateDailyExerciseXp([{exerciseId:'bench',completedWorkingSetCount:1}]),0,'one exercise set does not score');
  check(exerciseXp.calculateDailyExerciseXp([{exerciseId:'bench',completedWorkingSetCount:2}]),5,'two sets exercise scores');
  check(exerciseXp.calculateDailyExerciseXp([{exerciseId:'bench',completedWorkingSetCount:2},{exerciseId:'bench',completedWorkingSetCount:5}]),5,'duplicate exercise scores once');
  check(exerciseXp.calculateDailyExerciseXp(Array.from({length:20},(_,i)=>({exerciseId:`e${i}`,completedWorkingSetCount:2}))),30,'exercise daily cap');

  check(benchmarks.exerciseBaselineState(0),'UNSEEN','baseline unseen');
  check(benchmarks.exerciseBaselineState(1),'ESTABLISHED','baseline established after first');
  check(benchmarks.selectPriorHigherIsBetterPersonalBest([100,105,103]),105,'prior best');

  for (const [ratio, xp] of [[0.00999,0],[0.01,5],[0.02499,5],[0.025,10],[0.04999,10],[0.05,15],[0.10,15]]) {
    check(progression.progressionBonusForImprovementRatio(ratio), xp, `progression tier ${ratio}`);
  }
  check(progression.calculateExerciseProgressionBonus({hasPriorBaseline:false,qualifyingLiftingWorkout:true,improvementRatio:0.10}),0,'first observation baseline only');
  check(progression.calculateExerciseProgressionBonus({hasPriorBaseline:true,qualifyingLiftingWorkout:false,improvementRatio:0.10}),0,'non-lifting progression blocked');
  check(progression.calculateDailyProgressionXp([5,10]),15,'progression sums');
  check(progression.calculateDailyProgressionXp([15,15,15]),30,'progression daily cap');
  close(progression.relativeImprovementHigherIsBetter(100,105),0.05,'higher improvement');
  close(progression.estimatedOneRepMaxEpley(100,6),120,'Epley');
  check(progression.bodyweightProgressionBonus(10,11),5,'bodyweight +1');
  check(progression.bodyweightProgressionBonus(10,12),10,'bodyweight +2');
  check(progression.bodyweightProgressionBonus(10,13),15,'bodyweight +3');

  check(cardio.cardioBonusForActivity(cardioWorkout(899)),0,'run below 15 min');
  check(cardio.cardioBonusForActivity(cardioWorkout(900)),5,'run 15 min');
  check(cardio.cardioBonusForActivity(cardioWorkout(1800)),10,'run 30 min');
  check(cardio.cardioBonusForActivity(cardioWorkout(2700)),15,'run 45 min');
  check(cardio.calculateDailyCardioBonusXp([cardioWorkout(900),cardioWorkout(2700)]),15,'best cardio bonus only');

  check(weekly.calculateWeeklyLiftingConsistency(3,4),0.75,'weekly lifting 3/4');
  check(weekly.calculateWeeklyLiftingConsistency(7,4),1,'weekly lifting cap');
  check(weekly.nextWeeklyGoalStreak(7,true),8,'weekly streak increments');
  check(weekly.nextWeeklyGoalStreak(7,false),0,'weekly streak resets');
  check(weekly.weeklyImprovementBonus(),0,'no weekly improvement XP');

  check(qualification.qualifiesLiftingWorkout(strengthWorkout({activeDurationSeconds:1200,strengthSets:workingSets(4,20)})),true,'beginner lift qualifies');
  check(qualification.qualifiesLiftingWorkout(strengthWorkout({activeDurationSeconds:1200,strengthSets:workingSets(4,140)})),true,'advanced lift qualifies');
  check(baseXp.calculateDailyLiftingWorkoutXp(1),50,'raw strength does not change base');
  check(dailyXp.calculateDailyXpTotal({liftingWorkoutXp:50,exerciseXp:30,progressionXp:30,cardioBonusXp:15}),125,'daily max composition');

  console.log(`Internal lifting-v1 verification passed: ${assertions} assertions.`);
}

try {
  compileDomain();
  runAssertions();
} finally {
  fs.rmSync(out, { recursive: true, force: true });
}
