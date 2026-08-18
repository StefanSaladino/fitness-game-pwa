const assert = require('node:assert/strict');
const path = require('node:path');

const out = process.argv[2];
if (!out) throw new Error('Expected compiled domain output directory.');
const qualification = require(path.join(out, 'workouts/qualification.js'));
const baseXp = require(path.join(out, 'scoring/baseXp.js'));
const benchmarks = require(path.join(out, 'progression/benchmarks.js'));
const performance = require(path.join(out, 'progression/performance.js'));
const weekly = require(path.join(out, 'consistency/weekly.js'));

const baseWorkout = (overrides = {}) => ({
  category: 'RUNNING', status: 'COMPLETED', source: 'IN_APP', activeDurationSeconds: 900, ...overrides,
});
const workingSets = (n, weightKg = 20) => Array.from({ length: n }, () => ({ setType: 'WORKING', completed: true, reps: 8, weightKg }));

let assertions = 0;
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); assertions += 1; };
const close = (actual, expected, label) => { assert.ok(Math.abs(actual - expected) < 1e-10, `${label}: ${actual} != ${expected}`); assertions += 1; };

// Qualification boundaries.
for (const [category, threshold] of Object.entries({RUNNING:900,WALKING_HIKING:1800,CYCLING:1200,SWIMMING:900,SPORT:1200,CARDIO:1200,HIIT:720,MOBILITY:1200,OTHER:1200})) {
  check(qualification.qualifiesWorkout(baseWorkout({category, activeDurationSeconds: threshold - 1})), false, `${category} below threshold`);
  check(qualification.qualifiesWorkout(baseWorkout({category, activeDurationSeconds: threshold})), true, `${category} at threshold`);
}
check(qualification.qualifiesWorkout(baseWorkout({category:'STRENGTH', strengthSets:workingSets(4)})), true, 'strength exact boundary');
check(qualification.qualifiesWorkout(baseWorkout({category:'STRENGTH', activeDurationSeconds:899, strengthSets:workingSets(4)})), false, 'strength time boundary');
check(qualification.qualifiesWorkout(baseWorkout({category:'STRENGTH', strengthSets:workingSets(3)})), false, 'strength set boundary');

// Base XP invariant.
check(baseXp.calculateDailyBaseWorkoutXp(0), 0, 'zero workouts');
for (const n of [1,2,5,100]) check(baseXp.calculateDailyBaseWorkoutXp(n), 100, `daily cap count ${n}`);

// Benchmark lifecycle: third observation is first performance-eligible observation.
check(benchmarks.benchmarkState(0), 'UNSEEN', 'benchmark unseen');
check(benchmarks.benchmarkState(1), 'CALIBRATING', 'benchmark calibrating');
check(benchmarks.benchmarkState(2), 'ESTABLISHED', 'benchmark established');
check(benchmarks.selectInitialHigherIsBetterBenchmark([100,105]), 105, 'better-of-two high');
check(benchmarks.selectInitialHigherIsBetterBenchmark([105,100]), 105, 'anti-sandbag high');
check(benchmarks.selectInitialLowerIsBetterBenchmark([1680,1740]), 1680, 'better-of-two low');

// Account gate.
const start = new Date('2026-08-01T12:00:00.000Z');
check(performance.isAccountPerformanceEligible(start, new Date('2026-08-08T11:59:59.999Z')), false, 'before 168h');
check(performance.isAccountPerformanceEligible(start, new Date('2026-08-08T12:00:00.000Z')), true, 'at 168h');

// Performance tier exact boundaries.
for (const [ratio, xp] of [[0.00999,0],[0.01,5],[0.02499,5],[0.025,10],[0.04999,10],[0.05,15],[0.09999,15],[0.10,25]]) {
  check(performance.performanceBonusForImprovementRatio(ratio), xp, `performance tier ${ratio}`);
}
const eligibilityCommon = {accountEligible:true, qualifyingWorkout:true, cooldownEligible:true, improvementRatio:0.10};
check(performance.calculatePerformanceBonus({...eligibilityCommon,validPriorObservationCount:0}),0,'obs1 no bonus');
check(performance.calculatePerformanceBonus({...eligibilityCommon,validPriorObservationCount:1}),0,'obs2 no bonus');
check(performance.calculatePerformanceBonus({...eligibilityCommon,validPriorObservationCount:2}),25,'obs3 eligible');
check(performance.calculateDailyPerformanceXp([5,10]),10,'daily progress max');
check(performance.calculateDailyPerformanceXp([15,25,100]),25,'daily progress cap');
close(performance.relativeImprovementHigherIsBetter(100,105),0.05,'higher improvement');
close(performance.relativeImprovementLowerIsBetter(100,95),0.05,'lower improvement');
close(performance.estimatedOneRepMaxEpley(100,6),120,'Epley');
check(performance.estimatedOneRepMaxEpley(100,13),null,'Epley rep exclusion');

// Weekly consistency and improvement.
check(weekly.calculateWeeklyConsistency(3,4),0.75,'weekly 3/4');
check(weekly.calculateWeeklyConsistency(7,4),1,'weekly cap');
for (const [prev,curr,xp] of [[0.5,0.5,0],[0.5,0.55,10],[0.5,0.6,20],[0.5,0.75,35],[0.5,1,50]]) {
  check(weekly.weeklyImprovementBonus(prev,curr),xp,`weekly bonus ${prev}->${curr}`);
}
check(weekly.weeklyImprovementBonus(0.5,1,false),0,'target change blocks weekly bonus');

// Fairness: raw weight never changes qualification or daily base XP.
check(qualification.qualifiesWorkout(baseWorkout({category:'STRENGTH',activeDurationSeconds:1200,strengthSets:workingSets(4,20)})),true,'beginner strength qualifies');
check(qualification.qualifiesWorkout(baseWorkout({category:'STRENGTH',activeDurationSeconds:1200,strengthSets:workingSets(4,140)})),true,'advanced strength qualifies');
check(baseXp.calculateDailyBaseWorkoutXp(1),100,'same base XP regardless of strength');

console.log(`Internal domain verification passed: ${assertions} assertions.`);
