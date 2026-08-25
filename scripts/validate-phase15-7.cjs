const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`Phase 15.7 validation failed: ${message}`);
};
const dashboardModel = read('src/features/dashboard/model.ts');
const dashboardService = read('src/features/dashboard/dashboardService.ts');
const groupService = read('src/features/groups/groupService.ts');

ok(/groupId: string \| null/.test(dashboardModel), 'dashboard group context must be optional');
ok(/input\.groupId\s*\?/.test(dashboardService), 'dashboard leaderboard lookup must be conditional on group context');
ok(/Promise\.resolve\(\{ data: \[\], error: null \}\)/.test(dashboardService), 'solo dashboard must resolve an empty leaderboard without a group RPC');

ok(/\.eq\('user_id',userId\)\.eq\('status','ACTIVE'\)/.test(groupService), 'group service must continue loading every active membership for the user');
ok(!/\.single\(\)/.test(groupService.split('async listGroups')[1].split('async createGroup')[0]), 'group list must never collapse memberships to a single row');

console.log('Phase 15.7 optional/multi-group structural gate passed.');
