const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(condition, message) {
  if (!condition) throw new Error(`Phase 16.4 validation failed: ${message}`);
}

const screen = read('src/features/dashboard/components/DashboardScreen.tsx');
const css = read('src/features/dashboard/components/DashboardScreen.module.css');
const test = read('src/features/dashboard/components/DashboardScreen.test.tsx');
const roadmap = read('docs/ROADMAP.md');
const doc = read('docs/PHASE16.4-HOME-LIFTING-DASHBOARD.md');
const navigation = read('src/components/layout/navigation.ts');
const packageJson = JSON.parse(read('package.json'));
const serviceWorker = read('public/sw.js');
const pwaShellE2e = read('tests/e2e/pwa-shell.spec.ts');

for (const fragment of [
  "top-set-plate-banner.jpg",
  "onNavigate('workouts')",
  "onNavigate('cardio')",
  "onNavigate('compete')",
  'snapshot.completedLiftingDays',
  'snapshot.weeklyXp',
  'snapshot.xpBreakdown',
  'snapshot.recentLifts',
  'snapshot.recentPrs',
  'snapshot.consistency.badges',
  'snapshot.leaderboard',
  'Not in a group',
]) {
  ok(screen.includes(fragment), `dashboard screen preserves real contract: ${fragment}`);
}

for (const forbidden of [
  /RECOMMENDED/i,
  /Level\s*\d+/i,
  /weekly xp goal/i,
  /estimated time/i,
  /view workout plan/i,
  /day streak/i,
  /unlock your potential/i,
]) {
  ok(!forbidden.test(screen), `dashboard screen excludes invented concept copy: ${forbidden}`);
}

ok(!/linear-gradient|radial-gradient|backdrop-filter/i.test(css), 'dashboard avoids decorative gradients and glass effects');
ok(css.includes('var(--color-accent)'), 'dashboard uses the approved orange interaction accent');
ok(css.includes('var(--color-green)'), 'dashboard retains green for real completion/success state');
ok(css.includes('@media (min-width: 720px)'), 'dashboard has tablet/desktop adaptation');
ok(css.includes('@media (max-width: 560px)'), 'dashboard has narrow-phone adaptation');

for (const item of [
  "{ id: 'home', label: 'Home'",
  "{ id: 'workouts', label: 'Lift'",
  "{ id: 'groups', label: 'Groups'",
  "{ id: 'progress', label: 'Progress'",
  "{ id: 'compete', label: 'Compete'",
]) {
  ok(navigation.includes(item), `shared primary navigation remains unchanged: ${item}`);
}
ok(!/label: 'Exercises'|label: 'Cardio'|label: 'Settings'/.test(navigation), 'no unsupported primary destination was added');

ok(roadmap.includes('### 16.4 Home / lifting dashboard — DONE'), 'roadmap marks Phase 16.4 done');
ok(roadmap.includes('### 16.5 Active workout + set logging — NEXT'), 'roadmap advances Phase 16.5 to next');
ok(doc.includes('**DONE.**'), 'Phase 16.4 implementation record is complete');
ok(doc.includes('No database migration or hosted SQL mutation is required'), 'Phase 16.4 documents no database work');
ok(packageJson.version === '0.14.0', 'package version is 0.14.0 for the Phase 16.4 release');
ok(serviceWorker.includes("const CACHE_VERSION = 'v14-0'"), 'installed PWA cache advances for the Phase 16.4 release');
ok(pwaShellE2e.includes("name.endsWith('v14-0')"), 'offline-shell E2E targets the Phase 16.4 cache');

for (const fragment of [
  'top-set-plate-banner',
  "toHaveBeenCalledWith('workouts')",
  "toHaveBeenCalledWith('cardio')",
  "toHaveBeenCalledWith('compete')",
  'Not in a group',
]) {
  ok(test.includes(fragment), `dashboard regression test covers: ${fragment}`);
}

console.log('Phase 16.4 Home/lifting dashboard structural contract passed.');
