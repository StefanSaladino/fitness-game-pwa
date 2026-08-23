const fs = require('node:fs');
const file = 'scripts/validate-project-clean.cjs';
const source = fs.readFileSync(file, 'utf8');
const before = `if (!/must not rely only on localStorage, IndexedDB, or a single browser installation/.test(settingsContract)
    || !/request permission only after an explicit user action/.test(settingsContract)
    || !/must not silently set the account-level master preference to OFF/.test(settingsContract)
    || !/Data export must not appear as a functioning control until its backend exists/.test(settingsContract)
    || !/account-deletion backend[\\s\\S]*implemented by Phase 15\\.3C/.test(settingsContract)
    || !/product owner approved the 15\\.6A implementation slice/.test(settingsContract)) {
  fail('Profile/Settings contract must preserve server persistence, explicit notification permission, multi-device semantics, and no fake controls');
}`;
const after = `if (!/They do not rely only on localStorage, IndexedDB, or a single browser installation/.test(settingsContract)
    || !/request permission only after an explicit user action/.test(settingsContract)
    || !/denying permission on one device must not silently set the account-level master preference to OFF/.test(settingsContract)
    || !/Data export must not appear as a functioning control until its backend exists/.test(settingsContract)
    || !/account-deletion backend[\\s\\S]*implemented by Phase 15\\.3C/.test(settingsContract)
    || !/LOCKED; 15\\.6A–15\\.6D IMPLEMENTED\\./.test(settingsContract)
    || !/persisted unsupported categories remain unavailable rather than becoming fake controls/.test(settingsContract)) {
  fail('Profile/Settings contract must preserve current server persistence, explicit permission, multi-device, and honest-control semantics');
}`;
const first = source.indexOf(before);
if (first === -1 || source.indexOf(before, first + before.length) !== -1) {
  throw new Error('expected exactly one stale Settings contract assertion block');
}
fs.writeFileSync(file, source.slice(0, first) + after + source.slice(first + before.length));
fs.rmSync(__filename, { force: true });
