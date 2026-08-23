const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`Phase 15.7 validation failed: ${message}`);
};

const groupGate = read('src/features/groups/components/GroupGate.tsx');
const product = read('src/features/product/ProductController.tsx');
const dashboardModel = read('src/features/dashboard/model.ts');
const dashboardService = read('src/features/dashboard/dashboardService.ts');
const dashboardController = read('src/features/dashboard/components/DashboardController.tsx');
const dashboardScreen = read('src/features/dashboard/components/DashboardScreen.tsx');
const dashboardMembership = read('src/features/groups/components/DashboardGroupMembership.tsx');
const optionalGroupController = read('src/features/groups/components/OptionalGroupSetupController.tsx');
const optionalGroupScreen = read('src/features/groups/components/OptionalGroupSetupScreen.tsx');
const groupAdminController = read('src/features/groups/components/GroupAdministrationController.tsx');
const groupAdminScreen = read('src/features/groups/components/GroupAdministrationScreen.tsx');
const groupService = read('src/features/groups/groupService.ts');
const integration = read('tests/integration/group-product-journey.test.tsx');
const doc = read('docs/PHASE15.7-OPTIONAL-MULTI-GROUPS.md');

ok(!groupGate.includes('GroupSetupController'), 'GroupGate must no longer divert zero memberships into mandatory setup');
ok(/children\(groupState\.groups, groupState\.retry\)/.test(groupGate), 'GroupGate must pass every successfully loaded membership state into the product');

ok(!product.includes('if (!selectedGroup) return null'), 'ProductController must not blank the app when membership is empty');
ok(/\?\? groups\[0\] \?\? null/.test(product), 'selected group context must be nullable');
ok(product.includes('OptionalGroupSetupController'), 'group-dependent destinations need an honest zero-group state');
ok(/activeItem="groups"/.test(product) && /activeItem="compete"/.test(product), 'Groups and Competition must both handle zero memberships');
ok(product.includes('groupCount={groups.length}'), 'dashboard must receive real membership count');

ok(/groupId: string \| null/.test(dashboardModel), 'dashboard group context must be optional');
ok(/input\.groupId\s*\?/.test(dashboardService), 'dashboard leaderboard lookup must be conditional on group context');
ok(/Promise\.resolve\(\{ data: \[\], error: null \}\)/.test(dashboardService), 'solo dashboard must resolve an empty leaderboard without a group RPC');
ok(/groupId: group\?\.id \?\? null/.test(dashboardController), 'dashboard controller must pass null group context for solo users');
ok(dashboardController.includes('DashboardGroupMembership'), 'dashboard must compose the group-owned invitation surface');
ok(/group: GroupSummary \| null/.test(dashboardScreen), 'dashboard presentation must accept solo state');
ok(/SOLO TRAINING/.test(dashboardScreen) && /Not in a group/.test(dashboardScreen), 'solo dashboard must communicate absent group context honestly');
ok(/group && \(/.test(dashboardScreen), 'group leaderboard presentation must be omitted in solo mode');

ok(dashboardMembership.includes('usePendingGroupInvites'), 'dashboard invitation behavior must remain behind the focused group hook');
ok(/Groups are optional\./.test(dashboardMembership), 'dashboard must explicitly say groups are optional');
ok(/does not replace any group you already belong to/.test(dashboardMembership), 'dashboard invitation copy must preserve additive membership semantics');
ok(!/from\s+['"][^'"]*supabase|\.rpc\(|functions\.invoke/.test(dashboardMembership), 'dashboard group presentation must not call Supabase directly');

ok(optionalGroupController.includes('useCreateGroup') && optionalGroupController.includes('usePendingGroupInvites'), 'voluntary group setup must reuse focused group hooks');
ok(/Train solo or add a group when you want\./.test(optionalGroupScreen), 'Groups zero-state must be voluntary');
ok(/Competition starts when you join a group\./.test(optionalGroupScreen), 'Competition zero-state must explain the real dependency');
ok(/Nothing else is required/.test(optionalGroupScreen), 'solo continuation must be explicit');
ok(!/from\s+['"][^'"]*supabase|\.rpc\(|functions\.invoke/.test(optionalGroupScreen), 'voluntary group setup presentation must not call Supabase directly');

ok(groupAdminController.includes('useCreateGroup'), 'existing members must be able to create another group');
ok(/props\.onSelectGroup\(created\.id\)/.test(groupAdminController), 'newly created additional group should become current UI context after refresh');
ok(/Create another group/.test(groupAdminScreen), 'group administration must expose additional group creation');
ok(/join or own more than one at the same time/.test(groupAdminScreen), 'group administration must explain multi-group membership');
ok(/other group memberships are unchanged/.test(groupAdminScreen), 'leaving one group must be described as group-local');

ok(/\.eq\('user_id',userId\)\.eq\('status','ACTIVE'\)/.test(groupService), 'group service must continue loading every active membership for the user');
ok(!/\.single\(\)/.test(groupService.split('async listGroups')[1].split('async createGroup')[0]), 'group list must never collapse memberships to a single row');

for (const fragment of [
  'moves from completed onboarding directly into the personal dashboard with zero groups',
  'lets a solo user accept a targeted invitation from the dashboard when they choose',
  'lets a solo user create a group later from Groups without blocking personal training first',
  'keeps memberships additive when an existing owner accepts another invitation',
]) {
  ok(integration.includes(fragment), `integration journey missing: ${fragment}`);
}

ok(/supersedes the original Phase 5 assumption/.test(doc), 'phase document must explicitly supersede the old mandatory gate');
ok(/zero active groups/.test(doc) && /multiple active groups/.test(doc), 'phase document must define zero and multi-group states');
ok(/No schema migration is required/.test(doc), 'phase document must record that the existing schema already supports this correction');
ok(/\(group_id, user_id\)/.test(doc), 'phase document must record the hosted composite membership key');
ok(/Phase 16/.test(doc) && /re-inventory the new baseline/.test(doc), 'Phase 16 must remain downstream of this corrected product baseline');

console.log('Phase 15.7 optional/multi-group structural gate passed.');
