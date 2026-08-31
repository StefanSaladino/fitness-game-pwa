const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const fail = (message) => { throw new Error(`Badge gallery structural validation failed: ${message}`); };
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const requireFile = (rel) => {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
  return read(rel);
};
const requireMatch = (source, pattern, message) => {
  if (!pattern.test(source)) fail(message);
};

const model = requireFile('src/features/consistency/model.ts');
const canonicalKeys = [
  'FIRST_PR',
  'PR_5',
  'PR_10',
  'PR_25',
  'LIFT_DAYS_5',
  'LIFT_DAYS_10',
  'LIFT_DAYS_25',
  'LIFT_DAYS_50',
  'GOAL_WEEK_1',
  'GOAL_STREAK_2',
  'GOAL_STREAK_4',
  'GOAL_STREAK_8',
  'CARDIO_BONUS_DAYS_5',
  'CARDIO_BONUS_DAYS_10',
];
for (const key of canonicalKeys) {
  requireMatch(model, new RegExp(`['\"]${key}['\"]`), `authoritative badge key is missing from consistency model: ${key}`);
}

const catalog = requireFile('src/features/badges/badgeCatalog.ts');
requireMatch(catalog, /LIFTING_BADGE_KEYS\.map\(/, 'presentation catalog must be generated from LIFTING_BADGE_KEYS');
requireMatch(catalog, /liftingBadgeDefinition\(key\)/, 'presentation catalog must inherit canonical badge copy');
for (const key of canonicalKeys) {
  requireMatch(catalog, new RegExp(`\\b${key}\\s*:`), `presentation palette is missing: ${key}`);
}

const badgeAssetDir = path.join(root, 'src/features/badges/assets');
const badgeAssets = fs.readdirSync(badgeAssetDir).filter((name) => /\.(?:svg|png|jpe?g|webp)$/i.test(name));
if (badgeAssets.length !== 1 || badgeAssets[0] !== 'top-set-badge-emblem.svg') {
  fail('badge system must use exactly one shared visual emblem asset');
}

const coin = requireFile('src/features/badges/components/BadgeCoin.tsx');
const coinCss = requireFile('src/features/badges/components/BadgeCoin.module.css');
requireMatch(coin, /data-badge-emblem="top-set"/, 'BadgeCoin must expose the shared emblem contract');
requireMatch(coin, /data-badge-state=/, 'BadgeCoin must expose earned/locked state');
requireMatch(coin, /data-rotation=/, 'BadgeCoin must expose rotation state for validation');
requireMatch(coin, /onPointerDown=/, 'BadgeCoin must support pointer dragging');
requireMatch(coin, /onPointerMove=/, 'BadgeCoin must support pointer rotation');
requireMatch(coin, /onPointerUp=/, 'BadgeCoin must snap pointer rotation');
requireMatch(coin, /aria-pressed=/, 'BadgeCoin must expose which face is active');
requireMatch(coinCss, /transform-style:\s*preserve-3d/, 'BadgeCoin must retain its 3D face model');
requireMatch(coinCss, /backface-visibility:\s*hidden/, 'BadgeCoin faces must hide their reverse surface');
requireMatch(coinCss, /prefers-reduced-motion:\s*reduce/, 'BadgeCoin must support reduced motion');

const gallery = requireFile('src/features/badges/components/BadgeGalleryRoute.tsx');
requireMatch(gallery, /createLiftingConsistencyService/, 'gallery must use the authoritative consistency service');
requireMatch(gallery, /BADGE_CATALOG\.filter/, 'gallery must derive filters from the complete presentation catalog');
requireMatch(gallery, /'ALL'\s*\|\s*'EARNED'\s*\|\s*'LOCKED'/, 'gallery must retain All/Earned/Locked filters');
requireMatch(gallery, /data-badge-gallery/, 'gallery must expose a stable validation surface');

const badgeSources = [
  catalog,
  coin,
  gallery,
  requireFile('src/features/badges/index.ts'),
].join('\n');
if (/user_badges/i.test(badgeSources)) fail('badge presentation feature must not access user_badges directly');
if (/\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(/.test(badgeSources)) {
  fail('badge presentation feature must not mutate persistence');
}

const app = requireFile('src/app/App.tsx');
const dashboard = requireFile('src/features/dashboard/components/DashboardScreen.tsx');
requireMatch(app, /pathname\s*===\s*['\"]\/badges['\"]/, 'authenticated /badges route is missing');
requireMatch(dashboard, /navigateToPath\(['\"]\/badges['\"]\)/, 'dashboard badge-gallery entry point is missing');
requireMatch(dashboard, /<BadgeCoin/, 'dashboard must preview the collectible component');

requireFile('badges.e2e.html');
requireFile('tests/e2e/badgeGalleryHarness.tsx');
requireFile('tests/e2e/badge-gallery.spec.ts');
const vite = requireFile('vite.config.ts');
requireMatch(vite, /badges:\s*resolve\(process\.cwd\(\),\s*['\"]badges\.e2e\.html['\"]\)/, 'badge Playwright fixture is not included in reliability builds');

console.log(`Badge gallery structural validation passed: ${canonicalKeys.length} canonical badges, one shared emblem, authoritative earned state, rotation/accessibility contracts, and browser fixture wiring are intact.`);
