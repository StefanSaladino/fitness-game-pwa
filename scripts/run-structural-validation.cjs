const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const serviceWorkerPath = path.join(root, 'public', 'sw.js');
const actualServiceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');

for (const invariant of [
  "const CACHE_VERSION =",
  "self.addEventListener('push'",
  "self.addEventListener('notificationclick'",
  'showNotification',
]) {
  if (!actualServiceWorker.includes(invariant)) {
    throw new Error(`Release validation failed: current push-capable service worker missing: ${invariant}`);
  }
}

for (const [file, fragments] of [
  ['scripts/validate-project-clean.cjs', ['v13-1', '15.6B Notification preference persistence Ã¢â‚¬â€ LATER', '15.6C PWA notification permission + delivery integration Ã¢â‚¬â€ LATER', '15.6D Settings integration gate Ã¢â‚¬â€ LATER']],
  ['scripts/validate-project.cjs', ['0.12.1', '20260822000200_fix_lifting_calendar_summaries.sql', 'v12b-2']],
  ['public/sw.js', ['v12b-2']],
  ['.github/workflows/ci.yml', ['npx supabase start', 'npx supabase db reset', 'npm run db:test:local', 'npx supabase db lint --level warning']],
]) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const fragment of fragments) {
    if (text.includes(fragment)) throw new Error(`Stale assertion cleanup failed: ${file} still contains ${fragment}`);
  }
}

require('./validate-project-clean.cjs');

console.log('Current Phase 15.6/16 structural gate passed with no legacy assertion shims.');
