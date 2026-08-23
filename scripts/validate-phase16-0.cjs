const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`Phase 16.0 validation failed: ${message}`);
};

const doc = read('docs/PHASE16.0-VISUAL-INVENTORY-DIRECTION.md');
const roadmap = read('docs/ROADMAP.md');
const navigation = read('src/components/layout/navigation.ts');
const shell = read('src/components/layout/AppShell.tsx');
const globalCss = read('src/styles/global.css');
const tokens = read('src/styles/tokens.css');

ok(/\*\*REVIEW READY\.\*\*/.test(doc), 'inventory must remain review-ready until product-owner concept approval');
ok(/Phase 16\.0 is a design\/architecture checkpoint/.test(doc), 'phase boundary must remain design/architecture only');
ok(/changes no production UI, Supabase schema, scoring rule, authorization rule/.test(doc), 'review phase must lock runtime non-goals');

for (const surface of [
  'Sign in / create account / forgot password / verification',
  'Profile onboarding',
  'Zero-group entry',
  'Home / lifting dashboard',
  'Workouts / active lift',
  'Exercise selector/library',
  'Cardio accessory surface',
  'Progress / analytics',
  'Groups / invitations / administration',
  'Competition / social',
  'Settings',
  'Required user messages',
  'Platform administration',
  'PWA lifecycle',
]) {
  ok(doc.includes(surface), `surface inventory missing ${surface}`);
}

for (const preservedTruth of [
  'lifting remains the primary product activity',
  'cardio remains intentionally secondary',
  '`lifting-v1` scoring remains authoritative',
  'zero-group users must still be able to reach Settings',
  'optional notification preferences remain separate from browser/device permission',
  'offline/recovery/conflict behavior in active workouts remains functionally unchanged',
]) {
  ok(doc.includes(preservedTruth), `product truth missing: ${preservedTruth}`);
}

ok(/five primary mobile destinations maximum/.test(doc), 'mobile navigation direction must cap primary destinations at five');
ok(/Home, Lift, Groups, Progress, and Compete/.test(doc), 'candidate five-destination hierarchy must be explicit');
ok(/Profile\/Settings access into stable account\/header chrome/.test(doc), 'Settings must move to stable account chrome in the proposed shell');
ok(/Cardio remains accessible as a secondary activity surface/.test(doc), 'cardio must remain reachable without becoming primary navigation');
ok(/320px-class/.test(doc), 'narrow-phone review contract must be explicit');
ok(/phone:\*\* below 700px/.test(doc) && /desktop:\*\* 1024px and above/.test(doc), 'existing responsive compatibility breakpoints must be documented');

for (const tokenArea of ['Spacing', 'Touch targets', 'Typography', 'Radius', 'Borders and elevation', 'Color and semantic state', 'Motion']) {
  ok(doc.includes(`### ${tokenArea}`), `token direction missing ${tokenArea}`);
}
ok(/interactive target minimum: 44px/.test(doc), 'touch target direction must retain a 44px minimum');
ok(/prefers-reduced-motion/.test(doc), 'motion direction must preserve reduced-motion behavior');

for (const ownership of ['### Remains global', '### Shared component-owned', '### Feature-local']) {
  ok(doc.includes(ownership), `CSS ownership direction missing ${ownership}`);
}
ok(/migrate shared primitives\/layout into colocated modules/.test(doc), 'legacy global CSS migration direction must be incremental and colocated');
ok(/Do not create a speculative design-system API/.test(doc), 'token promotion must remain demonstrated-use only');

ok(/### Current baseline/.test(doc) && /### Target direction/.test(doc), 'before/after baseline references must exist');
ok(/## Phase 16\.1 concept brief/.test(doc), 'next visual concept brief must be explicit');
ok(/mark Phase 16\.1 approved without product-owner concept review/.test(doc), 'Phase 16.1 implementation must remain approval-gated');

ok(/### 16\.0 Visual inventory \+ mobile design-system direction — NEXT/.test(roadmap), 'roadmap must remain 16.0 NEXT while the direction is under review');
ok(/## Phase 16 — Mobile-first visual overhaul — NEXT/.test(roadmap), 'Phase 16 must remain the active next major phase');

const primaryNavItems = (navigation.match(/\{ id: '/g) || []).length;
ok(primaryNavItems === 6, 'inventory baseline expects the current six-item primary navigation before 16.1');
ok(navigation.includes("{ id: 'profile', label: 'Profile'"), 'inventory baseline expects Profile in the current primary nav');
ok(shell.includes('DesktopSidebar') && shell.includes('MobileNav'), 'inventory baseline must still match the current dual shell');
for (const selector of ['.product-shell', '.mobile-nav', '.page-header', '.ui-button', '.ui-card']) {
  ok(globalCss.includes(selector), `legacy shared global CSS baseline missing ${selector}`);
}
ok(globalCss.length > 20000, 'inventory baseline expects the legacy global stylesheet to remain substantial before 16.1');
ok(!tokens.includes('--space-') && !tokens.includes('--font-size-') && !tokens.includes('--motion-'), '16.0 must not prematurely add the proposed token scales');

console.log('Phase 16.0 review gate passed: the real product inventory, mobile shell direction, restrained token plan, CSS ownership boundary, and approval requirement are documented without production visual changes.');
