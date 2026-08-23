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
const product = read('src/features/product/ProductController.tsx');
const groupGate = read('src/features/groups/components/GroupGate.tsx');
const dashboardGroups = read('src/features/groups/components/DashboardGroupMembership.tsx');
const globalCss = read('src/styles/global.css');
const tokens = read('src/styles/tokens.css');

ok(/\*\*REVIEW READY\.\*\*/.test(doc), 'inventory must remain review-ready until concept approval');
ok(/This version is rebuilt from the Phase 15\.7 baseline/.test(doc), 'inventory must explicitly use the optional-group baseline');
ok(/changes no production UI, Supabase schema, scoring rule, authorization rule, group-membership rule/.test(doc), 'review phase must lock runtime non-goals');

for (const truth of [
  '**zero groups is a normal steady state**',
  '0, 1, or many groups',
  'accepting or creating a group adds membership/ownership without replacing existing memberships',
  'currently selected group is feature context, not global account identity',
  'Competition is honestly group-dependent',
  'optional notification preferences remain separate from browser/device notification permission',
  'offline/recovery/conflict behavior in active workouts remains functionally unchanged',
]) {
  ok(doc.includes(truth), `post-15.7 product truth missing: ${truth}`);
}

for (const surface of [
  'Solo dashboard entry',
  'Dashboard group context',
  'Home / lifting dashboard',
  'Workouts / active lift',
  'Exercise selector/library',
  'Cardio accessory surface',
  'Progress / analytics',
  'Groups — solo state',
  'Groups — member state',
  'Competition / social',
  'Settings',
  'Required user messages',
  'Platform administration',
  'PWA lifecycle',
]) {
  ok(doc.includes(surface), `surface inventory missing ${surface}`);
}

ok(/five stable primary mobile destinations maximum/.test(doc), 'mobile navigation direction must cap stable primary destinations at five');
ok(/Home, Lift, Groups, Progress, Compete/.test(doc), 'candidate stable five-destination hierarchy must be explicit');
ok(/navigation set should remain stable for 0\/1\/many-group users/.test(doc), 'membership must not reshuffle primary navigation');
ok(/no global group selector is added to the shell/.test(doc), 'group context must remain feature-local');
ok(/Cardio remains accessible as a secondary activity surface/.test(doc), 'cardio must remain reachable without becoming primary navigation');
ok(/320px-class/.test(doc), 'narrow-phone concept review must be explicit');

for (const tokenArea of ['Spacing', 'Touch targets', 'Typography', 'Radius', 'Borders and elevation', 'Color and semantic state', 'Motion']) {
  ok(doc.includes(`### ${tokenArea}`), `token direction missing ${tokenArea}`);
}
ok(/interactive target minimum: 44px/.test(doc), 'touch target direction must retain a 44px minimum');
ok(/prefers-reduced-motion/.test(doc), 'motion direction must preserve reduced-motion behavior');

for (const ownership of ['### Remains global', '### Shared component-owned', '### Feature-local']) {
  ok(doc.includes(ownership), `CSS ownership direction missing ${ownership}`);
}
ok(/migrate shared primitives\/layout into colocated modules/.test(doc) && /when each shared component is touched/.test(doc), 'shared CSS migration must stay incremental and colocated');
ok(/Do not create a speculative design-system API/.test(doc), 'token promotion must remain demonstrated-use only');

ok(/### Current baseline/.test(doc) && /### Target direction/.test(doc), 'before/after references must exist');
ok(/## Phase 16\.1 concept brief/.test(doc), 'next concept brief must be explicit');
ok(/approve Phase 16\.1 without product-owner concept review/.test(doc), 'production shell implementation must remain approval-gated');
ok(/Required roadmap reconciliation before merge/.test(doc), 'roadmap mismatch must be tracked before merge');

ok(/### 16\.0 Visual inventory \+ mobile design-system direction — NEXT/.test(roadmap), 'roadmap must keep 16.0 NEXT during review');
ok(/## Phase 16 — Mobile-first visual overhaul — NEXT/.test(roadmap), 'Phase 16 must remain the next major phase');

const primaryNavItems = (navigation.match(/\{ id: '/g) || []).length;
ok(primaryNavItems === 6, 'baseline still expects six current primary nav items before 16.1');
ok(navigation.includes("{ id: 'profile', label: 'Profile'"), 'baseline still expects Profile in current navigation');
ok(shell.includes('DesktopSidebar') && shell.includes('MobileNav'), 'baseline must still match the current dual shell');
ok(/groups\[0\]\?\.id \?\? ''/.test(product), 'ProductController must still model nullable selected group context');
ok(/groups\.find\([\s\S]*\?\? groups\[0\] \?\? null/.test(product), 'selected group must remain nullable rather than globally required');
ok(/groups\.length === 0/.test(groupGate) && /children\(\[\],\s*groupState\.retry\)/.test(groupGate), 'zero groups must remain a valid product path');
ok(/Groups are optional\./.test(dashboardGroups), 'dashboard must retain the solo-group explanation');
ok(/does not replace any group you already belong to/.test(dashboardGroups), 'dashboard invite copy must preserve additive membership semantics');

for (const selector of ['.product-shell', '.mobile-nav', '.page-header', '.ui-button', '.ui-card']) {
  ok(globalCss.includes(selector), `legacy shared global CSS baseline missing ${selector}`);
}
ok(globalCss.length > 20000, 'legacy global stylesheet should remain substantial before 16.1');
ok(!tokens.includes('--space-') && !tokens.includes('--font-size-') && !tokens.includes('--motion-'), '16.0 must not prematurely add proposed token scales');

console.log('Phase 16.0 review gate passed: the post-15.7 solo/multi-group inventory, stable shell direction, restrained token plan, CSS ownership boundary, and approval requirement are documented without production visual changes.');
