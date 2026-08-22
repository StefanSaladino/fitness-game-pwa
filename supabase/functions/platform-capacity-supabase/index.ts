import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const SUPABASE_MANAGEMENT_BASE_URL = 'https://api.supabase.com';
const BILLING_USAGE_NOTE =
  'Supabase does not currently document a stable Management API endpoint for authoritative organization billing-cycle MAU, egress, cached egress, or Realtime billing totals. Values remain unavailable rather than inferred.';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const providerMetrics = [
  ['supabase_monthly_active_users', 'count'],
  ['supabase_egress_bytes', 'bytes'],
  ['supabase_cached_egress_bytes', 'bytes'],
  ['supabase_realtime_messages', 'count'],
  ['supabase_realtime_peak_connections', 'count'],
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

function resolvePublishableKey(): string | null {
  const current = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (current) {
    try {
      // Supabase exposes a JSON map whose values are environment-variable names,
      // not the publishable key values themselves. Resolve the named variable.
      const parsed = JSON.parse(current) as Record<string, unknown>;
      const publishableEnvName = parsed.default ?? Object.values(parsed)[0];
      if (typeof publishableEnvName === 'string' && publishableEnvName.length > 0) {
        const publishableKey = Deno.env.get(publishableEnvName);
        if (publishableKey) return publishableKey;
      }
    } catch {
      // Fall through to the legacy anon key while Supabase transitions key formats.
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

async function managementGet(path: string, accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_MANAGEMENT_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function unavailableMetrics(measuredAt: string) {
  return providerMetrics.map(([code, unit]) => ({
    code,
    source: 'SUPABASE_MANAGEMENT' as const,
    scope: 'ORGANIZATION' as const,
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
    // Preserve the platform-admin non-disclosure contract: callers who are not
    // positively authorized receive the same generic missing-resource response.
    return notFound();
  }

  const fetchedAt = new Date().toISOString();
  const accessToken = Deno.env.get('SUPABASE_MANAGEMENT_ACCESS_TOKEN');
  const organizationSlug = Deno.env.get('SUPABASE_ORGANIZATION_SLUG');
  const managementApiConfigured = Boolean(accessToken && organizationSlug);

  let organizationVerified = false;
  let entitlementsReachable = false;

  if (accessToken && organizationSlug) {
    const encodedSlug = encodeURIComponent(organizationSlug);
    organizationVerified = await managementGet(`/v1/organizations/${encodedSlug}`, accessToken);
    if (organizationVerified) {
      entitlementsReachable = await managementGet(
        `/v1/organizations/${encodedSlug}/entitlements`,
        accessToken,
      );
    }
  }

  return jsonResponse({
    source: 'SUPABASE_MANAGEMENT',
    scope: 'ORGANIZATION',
    fetchedAt,
    metrics: unavailableMetrics(fetchedAt),
    capability: {
      managementApiConfigured,
      organizationVerified,
      entitlementsReachable,
      billingUsageApi: 'UNAVAILABLE',
    },
  });
});
