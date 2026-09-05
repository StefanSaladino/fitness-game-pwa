const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requireText = (file, text) => {
  const source = read(file);
  if (!source.includes(text)) throw new Error(`${file} is missing required Phase 18.4 contract: ${text}`);
};

requireText('src/features/workout/supersetFlow.ts', 'deriveSupersetFlow');
requireText('src/features/workout/supersetFlow.ts', 'currentSetNumber');
requireText('src/features/workout/components/WorkoutSessionScreen.tsx', 'Active sequence');
requireText('src/features/workout/components/WorkoutSessionScreen.tsx', 'Go to ${currentPosition}');
requireText('src/features/workout/components/WorkoutSessionScreen.tsx', "aria-current={supersetCurrent ? 'step' : undefined}");
requireText('src/features/workout/components/WorkoutSessionScreen.tsx', 'deriveSupersetFlow(members, props.workoutSets)');
requireText('docs/PHASE18-LIVE-WORKOUT-ROADMAP.md', '**18.7A Drop Sets:**');
requireText('docs/PHASE18-LIVE-WORKOUT-ROADMAP.md', 'There is no separate Pyramid Set feature');
requireText('docs/PHASE18-4-SUPERSET-ACTIVE-FLOW.md', 'A1 Set 1 → A2 Set 1');

console.log('Phase 18.4 Superset active-flow validation passed: round-robin guidance is derived, optional, progress-aware, and scoring-neutral; Drop Sets are locked for 18.7A.');
