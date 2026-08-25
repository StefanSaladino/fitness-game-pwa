const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(condition, message) {
  if (!condition) throw new Error(`Phase 16.5 validation failed: ${message}`);
}
const serviceWorker = read('public/sw.js');

for (const asset of [
  'bench-press.png',
  'incline-press.png',
  'back-squat.png',
  'overhead-press.png',
  'deadlift.png',
  'dumbbell-curl.png',
  'generic-weight.png',
]) {
  ok(fs.existsSync(path.join(root, 'src/assets/fitness/exercise-icons', asset)), `exercise icon asset exists: ${asset}`);
}
ok(serviceWorker.includes("const CACHE_VERSION = 'v14-1'"), 'Phase 16.5 preserves the current installed-PWA cache generation');

console.log('Phase 16.5 Active workout/set logging structural contract passed.');
