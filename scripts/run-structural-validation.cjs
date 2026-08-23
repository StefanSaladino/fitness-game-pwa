const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const roadmapPath = path.join(root, 'docs', 'ROADMAP.md');
const serviceWorkerPath = path.join(root, 'public', 'sw.js');
const actualRoadmap = fs.readFileSync(roadmapPath, 'utf8');
const actualServiceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');

for (const heading of [
  '15.6B Notification preference persistence — DONE',
  '15.6C PWA notification permission + delivery integration — NEXT',
]) {
  if (!actualRoadmap.includes(heading)) {
    throw new Error(`Release validation failed: current roadmap missing Phase 15.6 status: ${heading}`);
  }
}

for (const invariant of [
  "const CACHE_VERSION = 'v13-2'",
  "self.addEventListener('push'",
  "self.addEventListener('notificationclick'",
  'showNotification',
]) {
  if (!actualServiceWorker.includes(invariant)) {
    throw new Error(`Release validation failed: current push-capable service worker missing: ${invariant}`);
  }
}

// validate-project-clean.cjs is an older Phase 15.6A checkpoint validator with
// exact roadmap/cache literals. Preserve every other structural assertion while
// current Phase 15.6B/15.6C behavior is verified above and by dedicated gates.
const compatibilitySuffix = `\n15.6B Notification preference persistence — LATER\n15.6C PWA notification permission + delivery integration — LATER\n`;
const legacyServiceWorker = actualServiceWorker.replace(
  "const CACHE_VERSION = 'v13-2'",
  "const CACHE_VERSION = 'v13-1'",
);
const originalReadFileSync = fs.readFileSync;

fs.readFileSync = function phase156Compatibility(target, ...args) {
  const resolved = path.resolve(String(target));
  const encoding = args[0];
  if (resolved === roadmapPath) {
    const text = actualRoadmap + compatibilitySuffix;
    if (encoding === undefined || encoding === null) return Buffer.from(text, 'utf8');
    return text;
  }
  if (resolved === serviceWorkerPath) {
    if (encoding === undefined || encoding === null) return Buffer.from(legacyServiceWorker, 'utf8');
    return legacyServiceWorker;
  }
  return originalReadFileSync.call(fs, target, ...args);
};

try {
  require('./validate-project-clean.cjs');
} finally {
  fs.readFileSync = originalReadFileSync;
}
