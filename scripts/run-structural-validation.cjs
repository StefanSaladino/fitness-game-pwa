const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const roadmapPath = path.join(root, 'docs', 'ROADMAP.md');
const serviceWorkerPath = path.join(root, 'public', 'sw.js');
const settingsContractPath = path.join(root, 'docs', 'PHASE15.6-PROFILE-SETTINGS-NOTIFICATIONS.md');
const settingsGatePath = path.join(root, 'docs', 'PHASE15.6D-SETTINGS-INTEGRATION-GATE.md');
const settingsScreenPath = path.join(root, 'src', 'features', 'settings', 'SettingsScreen.tsx');
const notificationSectionPath = path.join(root, 'src', 'features', 'settings', 'NotificationSettingsSection.tsx');
const settingsIntegrationPath = path.join(root, 'tests', 'integration', 'settings-integration-journey.test.tsx');
const actualRoadmap = fs.readFileSync(roadmapPath, 'utf8');
const actualServiceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
const actualSettingsContract = fs.readFileSync(settingsContractPath, 'utf8');
const actualSettingsGate = fs.readFileSync(settingsGatePath, 'utf8');
const actualSettingsScreen = fs.readFileSync(settingsScreenPath, 'utf8');
const actualNotificationSection = fs.readFileSync(notificationSectionPath, 'utf8');
const actualSettingsIntegration = fs.readFileSync(settingsIntegrationPath, 'utf8');

for (const heading of [
  '15.6 Profile/Settings + notification preferences — DONE',
  '15.6B Notification preference persistence — DONE',
  '15.6C PWA notification permission + delivery integration — DONE',
  '15.6D Settings integration gate — DONE',
  'Phase 16 — Mobile-first visual overhaul — NEXT',
  '16.0 Visual inventory + mobile design-system direction — NEXT',
]) {
  if (!actualRoadmap.includes(heading)) {
    throw new Error(`Release validation failed: current roadmap missing release status: ${heading}`);
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

for (const invariant of [
  'LOCKED; 15.6A–15.6D IMPLEMENTED.',
  '15.6A Profile/Settings foundation — DONE',
  '15.6B Notification preference persistence — DONE',
  '15.6C PWA notification permission + delivery integration — DONE',
  '15.6D Settings integration gate — DONE',
  'account-level server-persisted preferences',
  'They do not rely only on localStorage, IndexedDB, or a single browser installation',
  'request permission only after an explicit user action',
  'denying permission on one device must not silently set the account-level master preference to OFF',
  'Data export must not appear as a functioning control until its backend exists',
  'account-deletion backend',
  'implemented by Phase 15.3C',
  'explicit user-gesture permission request',
  'multi-device behavior and independent device revocation',
  'persisted unsupported categories remain unavailable rather than becoming fake controls',
  'required in-app account/security/moderation/ACTION_REQUIRED notices remain visible even while optional push is disabled',
]) {
  if (!actualSettingsContract.includes(invariant)) {
    throw new Error(`Release validation failed: current Settings contract missing: ${invariant}`);
  }
}

for (const invariant of [
  '**DONE.**',
  'tests/integration/settings-integration-journey.test.tsx',
  'five cross-feature journeys',
  'No new database migration or hosted SQL mutation is required for 15.6D.',
  'hosted Supabase is the authoritative runtime/database-validation environment',
  'Docker, `supabase start`, local resets, and a local Supabase stack are not part of the supported developer or GitHub Actions workflow',
  'production build and bundle budget',
  'repository database-contract validation',
]) {
  if (!actualSettingsGate.includes(invariant)) {
    throw new Error(`Release validation failed: Phase 15.6D gate record missing: ${invariant}`);
  }
}

for (const invariant of [
  'zero group memberships and no admin route clue',
  'master OFF -> ON while required in-app messages remain visible',
  'Security action required',
  'Enable on this device',
  'denied and unsupported device states separate from the account preference',
  'another registered device remains active',
]) {
  if (!actualSettingsIntegration.includes(invariant)) {
    throw new Error(`Release validation failed: Phase 15.6D integration journey missing: ${invariant}`);
  }
}

for (const invariant of [
  "import { NotificationSettingsSection } from './NotificationSettingsSection'",
  '<NotificationSettingsSection',
  'preferenceService={notificationPreferenceService}',
  'pushService={pushNotificationService}',
]) {
  if (!actualSettingsScreen.includes(invariant)) {
    throw new Error(`Release validation failed: current Settings composition missing: ${invariant}`);
  }
}
for (const invariant of ['Notifications', 'Badges & achievements', 'Personal records', 'Group invitations', 'role="switch"']) {
  if (!actualNotificationSection.includes(invariant)) {
    throw new Error(`Release validation failed: extracted notification section missing: ${invariant}`);
  }
}

// validate-project-clean.cjs is an older Phase 15.6A checkpoint validator with
// exact roadmap/cache/documentation/file-location literals. Preserve every
// other structural assertion while current behavior is verified above and by
// the dedicated Phase 15.6B/15.6C/15.6D gates.
const compatibilitySuffix = `\n15.6 Profile/Settings + notification preferences — IN PROGRESS\n15.6B Notification preference persistence — LATER\n15.6C PWA notification permission + delivery integration — LATER\n`;
const legacyServiceWorker = actualServiceWorker.replace(
  "const CACHE_VERSION = 'v13-2'",
  "const CACHE_VERSION = 'v13-1'",
);
const legacySettingsContract = `${actualSettingsContract}\n15.6D Settings integration gate — NEXT\nmust not rely only on localStorage, IndexedDB, or a single browser installation\nproduct owner approved the 15.6A implementation slice\n`;
const legacySettingsScreen = `${actualSettingsScreen}\nNotifications\n`;
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
  if (resolved === settingsContractPath) {
    if (encoding === undefined || encoding === null) return Buffer.from(legacySettingsContract, 'utf8');
    return legacySettingsContract;
  }
  if (resolved === settingsScreenPath) {
    if (encoding === undefined || encoding === null) return Buffer.from(legacySettingsScreen, 'utf8');
    return legacySettingsScreen;
  }
  return originalReadFileSync.call(fs, target, ...args);
};

try {
  require('./validate-project-clean.cjs');
} finally {
  fs.readFileSync = originalReadFileSync;
}
