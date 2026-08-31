const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`Phase 17.6 validation failed: ${message}`);
};

function readTree(relativeDir) {
  const dir = path.join(root, relativeDir);
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return readTree(relative);
    if (!/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) return [];
    return [read(relative)];
  }).join('\n');
}

const service = read('src/features/admin/capacity/capacityDashboardService.ts');
const provider = read('src/features/admin/capacity/netlifyApiProvider.ts');
const dashboard = read('src/features/admin/capacity/components/CapacityDashboard.tsx');
const edge = read('supabase/functions/platform-capacity-netlify/index.ts');
const config = read('supabase/config.toml');
const netlify = read('netlify.toml');
const browserSource = readTree('src');

ok(service.includes('createSupabaseNetlifyCapacityProvider'), 'Capacity service must depend on the secured Netlify provider adapter');
ok(!service.includes('client.functions.invoke'), 'Capacity service must not own raw provider-function transport');
ok(!service.includes('VITE_NETLIFY_CAPACITY_ENABLED'), 'retired browser feature switch must stay removed');
ok(provider.includes("client.functions.invoke('platform-capacity-netlify'"), 'Netlify provider adapter must invoke the secured Edge Function');

ok(provider.includes('providerReachable'), 'provider envelope must distinguish function reachability from provider configuration');
ok(provider.includes("billingUsageApi: 'UNAVAILABLE'"), 'provider must record the unsupported authoritative billing-usage API');
ok(provider.includes('value: null') && provider.includes('limit: null'), 'unavailable provider metrics must remain null rather than zero');

ok(dashboard.includes('Netlify account telemetry'), 'Capacity UI must expose the Netlify provider boundary');
ok(dashboard.includes('Not exposed'), 'Capacity UI must label unsupported billing totals explicitly');
ok(dashboard.includes('Account and project verified'), 'Capacity UI must surface verified account/project connectivity');
ok(dashboard.includes('Admin-only Edge Function'), 'Capacity UI must identify the server-side boundary');

for (const secret of ['NETLIFY_ACCESS_TOKEN', 'NETLIFY_ACCOUNT_ID', 'NETLIFY_SITE_ID']) {
  ok(edge.includes(`Deno.env.get('${secret}')`), `Edge Function must read ${secret} from server-only environment`);
  ok(!browserSource.includes(secret), `${secret} must not appear anywhere under src/`);
  ok(!netlify.includes(secret), `${secret} must not appear in netlify.toml`);
}

ok(edge.includes('get_my_platform_access'), 'Edge Function must re-check platform-admin access');
ok(edge.includes("access.account_status === 'ACTIVE'"), 'Edge Function must reject suspended/inactive admins');
ok(edge.includes('providerReachable: true'), 'valid Edge Function envelopes must declare provider reachability');
ok(edge.includes("billingUsageApi: 'UNAVAILABLE'"), 'Edge Function must fail closed for unsupported billing totals');
ok(edge.includes('value: null') && edge.includes('limit: null'), 'Edge Function must never turn unavailable usage into zero');
ok(edge.includes('/accounts/') && edge.includes('/sites/'), 'Edge Function must verify the configured Netlify account and project through documented REST resources');

ok(config.includes('[functions.platform-capacity-netlify]'), 'Supabase config must declare the Netlify capacity function');
ok(/\[functions\.platform-capacity-netlify\][\s\S]*?verify_jwt\s*=\s*true/.test(config), 'Netlify capacity function must keep verify_jwt enabled');

console.log('Phase 17.6 Netlify capacity validation passed: admin-only server boundary is wired, provider secrets stay out of the browser, account/project connectivity is verifiable, and unsupported billing totals fail closed.');
