import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const NETLIFY_API_BASE_URL = 'https://api.netlify.com/api/v1';
const BILLING_USAGE_NOTE =
  'Netlify does not currently document a stable public API endpoint for authoritative account Usage & billing totals for bandwidth, web requests, or build/credit usage. Values remain unavailable rather than inferred.';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const providerMetrics = [
  ['netlify_bandwidth_bytes', 'bytes'],
  ['netlify_requests', 'count'],
  ['netlify_build_usage', 'credits'],
] as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function notFound(): Response {
  return jsonResponse({ error: 'Not found' }, 404);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolvePublishableKey(): string | null {
  const current = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (current) {
    try {
      const parsed = JSON.parse(current) as Record<string, unknown>;
      const publishableEnvName = parsed.default ?? Object.values(parsed)[0];
      if (typeof publishableEnvName === 'string' && publishableEnvName.length > 0) {
        const publishableKey = Deno.env.get(publishableEnvName);
        if (publishableKey) return publishableKey;
      }
    } catch {
      // Fall through to the legacy anon key during Supabase's key transition.
    }
  }

  const legacy = Deno.env.get('SUPABASE_ANON_KEY');
  return legacy && legacy.length > 0 ? legacy : null;
}

async function isActivePlatformAdmin(authorization: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = resolvePublishableKey();
  if (!supabaseUrl || !publishableKey) return false;

  const client = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await client.rpc('get_my_platform_access');
  if (error || !Array.isArray(data) || data.length !== 1) return false;
  const access = data[0] as { account_status?: unknown; is_platform_admin?: unknown };
  return access.account_status === 'ACTIVE' && access.is_platform_admin === true;
}

async function netlifyGet(path: string, accessToken: string): Promise<unknown | null> {
  try {
    const response = await fetch(`${NETLIFY_API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'User-Agent': 'fitness-game-pwa-capacity/15.2D',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function unavailableMetrics(measuredAt: string) {
  return providerMetrics.map(([code, unit]) => ({
    code,
    source: 'NETLIFY_API' as const,
    scope: 'ACCOUNT' as const,
    unit,
    value: null,
    limit: null,
    measuredAt,
    available: false,
    note: BILLING_USAGE_NOTE,
  }));
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ') || !(await isActivePlatformAdmin(authorization))) {
    return notFound();
  }

  const fetchedAt = new Date().toISOString();
  const accessToken = Deno.env.get('NETLIFY_ACCESS_TOKEN');
  const accountId = Deno.env.get('NETLIFY_ACCOUNT_ID');
  const siteId = Deno.env.get('NETLIFY_SITE_ID');
  const apiConfigured = Boolean(accessToken && accountId);
  const siteConfigured = Boolean(siteId);

  let accountVerified = false;
  let siteVerified = false;

  if (accessToken && accountId) {
    const account = await netlifyGet(`/accounts/${encodeURIComponent(accountId)}`, accessToken);
    const verifiedAccountId = isRecord(account) && typeof account.id === 'string' ? account.id : null;
    accountVerified = verifiedAccountId === accountId;

    if (accountVerified && siteId && verifiedAccountId) {
      const site = await netlifyGet(`/sites/${encodeURIComponent(siteId)}`, accessToken);
      siteVerified = isRecord(site)
        && site.id === siteId
        && site.account_id === verifiedAccountId;
    }
  }

  return jsonResponse({
    source: 'NETLIFY_API',
    scope: 'ACCOUNT',
    fetchedAt,
    metrics: unavailableMetrics(fetchedAt),
    capability: {
      apiConfigured,
      accountVerified,
      siteConfigured,
      siteVerified,
      billingUsageApi: 'UNAVAILABLE',
    },
  });
});
