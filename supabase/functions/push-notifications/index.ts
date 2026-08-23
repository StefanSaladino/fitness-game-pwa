import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.112.3';
import webPush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VAPID_SUBJECT = 'https://github.com/StefanSaladino';

type RuntimeRow = {
  edge_function_url?: unknown;
  dispatch_token?: unknown;
  vapid_public_key?: unknown;
  vapid_private_key?: unknown;
};

type DeliveryRow = {
  queue_id?: unknown;
  category?: unknown;
  title?: unknown;
  body?: unknown;
  target_path?: unknown;
  subscription_id?: unknown;
  endpoint?: unknown;
  p256dh?: unknown;
  auth_secret?: unknown;
};

type Runtime = {
  dispatchToken: string;
  publicKey: string | null;
  privateKey: string | null;
};

type DeliveryTarget = {
  queueId: string;
  category: string;
  title: string;
  body: string;
  targetPath: string;
  subscriptionId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function notFound(): Response {
  return jsonResponse({ error: 'Not found' }, 404);
}

function serviceClient(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function resolvePublishableKey(): string | null {
  const current = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (current) {
    try {
      const parsed = JSON.parse(current) as Record<string, unknown>;
      const candidate = parsed.default ?? Object.values(parsed)[0];
      if (typeof candidate === 'string' && candidate.length > 0) {
        const indirect = Deno.env.get(candidate);
        if (indirect) return indirect;
        if (candidate.startsWith('sb_publishable_')) return candidate;
      }
    } catch {
      // Fall through to the legacy key during Supabase's key transition.
    }
  }
  const legacy = Deno.env.get('SUPABASE_ANON_KEY');
  return legacy && legacy.length > 0 ? legacy : null;
}

async function activeAuthenticatedUser(authorization: string): Promise<string | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const publishableKey = resolvePublishableKey();
  const token = authorization.slice('Bearer '.length).trim();
  if (!url || !publishableKey || !token) return null;

  const caller = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: userResult, error: userError } = await caller.auth.getUser(token);
  if (userError || !userResult.user) return null;

  const { data: accessRows, error: accessError } = await caller.rpc('get_my_platform_access');
  if (accessError || !Array.isArray(accessRows) || accessRows.length !== 1) return null;
  const access = accessRows[0] as { account_status?: unknown };
  if (access.account_status !== 'ACTIVE') return null;
  return userResult.user.id;
}

function parseRuntime(data: unknown): Runtime | null {
  const row = Array.isArray(data) ? data[0] as RuntimeRow | undefined : undefined;
  if (!row || typeof row.dispatch_token !== 'string' || row.dispatch_token.length < 32) return null;
  const publicKey = typeof row.vapid_public_key === 'string' && row.vapid_public_key.length > 0
    ? row.vapid_public_key
    : null;
  const privateKey = typeof row.vapid_private_key === 'string' && row.vapid_private_key.length > 0
    ? row.vapid_private_key
    : null;
  if ((publicKey === null) !== (privateKey === null)) return null;
  return { dispatchToken: row.dispatch_token, publicKey, privateKey };
}

async function getRuntime(admin: SupabaseClient): Promise<Runtime | null> {
  const { data, error } = await admin.rpc('get_push_delivery_runtime');
  if (error) {
    console.error('Push runtime read failed', error.code ?? 'RUNTIME_READ_FAILED');
    return null;
  }
  return parseRuntime(data);
}

async function ensureVapidKeys(admin: SupabaseClient, runtime: Runtime): Promise<Runtime | null> {
  if (runtime.publicKey && runtime.privateKey) return runtime;
  const generated = webPush.generateVAPIDKeys();
  const { data, error } = await admin.rpc('initialize_push_vapid_keys', {
    p_public_key: generated.publicKey,
    p_private_key: generated.privateKey,
  });
  if (error) {
    console.error('VAPID initialization failed', error.code ?? 'VAPID_INIT_FAILED');
    return null;
  }
  const row = Array.isArray(data) ? data[0] as { vapid_public_key?: unknown; vapid_private_key?: unknown } | undefined : undefined;
  if (!row || typeof row.vapid_public_key !== 'string' || typeof row.vapid_private_key !== 'string') return null;
  return { ...runtime, publicKey: row.vapid_public_key, privateKey: row.vapid_private_key };
}

function deliveryTarget(value: DeliveryRow): DeliveryTarget | null {
  const fields = [
    value.queue_id,
    value.category,
    value.title,
    value.body,
    value.target_path,
    value.subscription_id,
    value.endpoint,
    value.p256dh,
    value.auth_secret,
  ];
  if (fields.some((field) => typeof field !== 'string' || field.length === 0)) return null;
  if (!(value.endpoint as string).startsWith('https://')) return null;
  if (!(value.target_path as string).startsWith('/') || (value.target_path as string).startsWith('//')) return null;
  return {
    queueId: value.queue_id as string,
    category: value.category as string,
    title: value.title as string,
    body: value.body as string,
    targetPath: value.target_path as string,
    subscriptionId: value.subscription_id as string,
    endpoint: value.endpoint as string,
    p256dh: value.p256dh as string,
    auth: value.auth_secret as string,
  };
}

function providerFailure(error: unknown): { outcome: 'EXPIRED' | 'RETRY' | 'FAILED'; code: string } {
  const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
    ? Number((error as { statusCode?: unknown }).statusCode)
    : NaN;
  if (statusCode === 404 || statusCode === 410) return { outcome: 'EXPIRED', code: 'PUSH_ENDPOINT_GONE' };
  if (statusCode === 408 || statusCode === 429 || statusCode >= 500) {
    return { outcome: 'RETRY', code: 'PUSH_PROVIDER_TEMPORARY' };
  }
  return { outcome: 'FAILED', code: 'PUSH_PROVIDER_REJECTED' };
}

async function recordResult(
  admin: SupabaseClient,
  target: DeliveryTarget,
  outcome: 'SENT' | 'EXPIRED' | 'RETRY' | 'FAILED',
  errorCode: string | null,
): Promise<boolean> {
  const { error } = await admin.rpc('record_push_delivery_result', {
    p_queue_id: target.queueId,
    p_subscription_id: target.subscriptionId,
    p_outcome: outcome,
    p_error_code: errorCode,
  });
  if (error) {
    console.error('Push result recording failed', error.code ?? 'RESULT_RECORD_FAILED');
    return false;
  }
  return true;
}

async function drainQueue(admin: SupabaseClient, queueId: string, runtime: Runtime): Promise<Response> {
  if (!runtime.publicKey || !runtime.privateKey) {
    return jsonResponse({ error: 'Push runtime unavailable', code: 'PUSH_RUNTIME_UNAVAILABLE' }, 503);
  }

  webPush.setVapidDetails(VAPID_SUBJECT, runtime.publicKey, runtime.privateKey);
  const { data, error } = await admin.rpc('prepare_push_delivery', { p_queue_id: queueId });
  if (error) {
    console.error('Push delivery preparation failed', error.code ?? 'PREPARE_FAILED');
    return jsonResponse({ error: 'Push delivery unavailable', code: 'PUSH_PREPARE_FAILED' }, 503);
  }

  const targets = (Array.isArray(data) ? data : [])
    .map((row) => deliveryTarget(row as DeliveryRow))
    .filter((row): row is DeliveryTarget => row !== null);

  let sent = 0;
  let expired = 0;
  let retryable = 0;
  let failed = 0;

  for (const target of targets) {
    const payload = JSON.stringify({
      title: target.title,
      body: target.body,
      url: target.targetPath,
      tag: `workout-game:${target.category}:${target.queueId}`,
    });
    try {
      await webPush.sendNotification({
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      }, payload, { TTL: 300 });
      if (await recordResult(admin, target, 'SENT', null)) sent += 1;
      else failed += 1;
    } catch (sendError) {
      const outcome = providerFailure(sendError);
      await recordResult(admin, target, outcome.outcome, outcome.code);
      if (outcome.outcome === 'EXPIRED') expired += 1;
      else if (outcome.outcome === 'RETRY') retryable += 1;
      else failed += 1;
    }
  }

  return jsonResponse({ queueId, targets: targets.length, sent, expired, retryable, failed });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  let body: { action?: unknown; queueId?: unknown };
  try {
    body = await request.json() as { action?: unknown; queueId?: unknown };
  } catch {
    return jsonResponse({ error: 'Invalid request', code: 'INVALID_PUSH_REQUEST' }, 400);
  }

  const admin = serviceClient();
  if (!admin) return jsonResponse({ error: 'Push service unavailable', code: 'PUSH_SERVICE_UNAVAILABLE' }, 503);

  const runtime = await getRuntime(admin);
  if (!runtime) return jsonResponse({ error: 'Push runtime unavailable', code: 'PUSH_RUNTIME_UNAVAILABLE' }, 503);

  if (body.action === 'GET_PUBLIC_KEY') {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return notFound();
    const userId = await activeAuthenticatedUser(authorization);
    if (!userId) return notFound();
    const ready = await ensureVapidKeys(admin, runtime);
    if (!ready?.publicKey) return jsonResponse({ error: 'Push runtime unavailable', code: 'PUSH_RUNTIME_UNAVAILABLE' }, 503);
    return jsonResponse({ publicKey: ready.publicKey });
  }

  if (body.action !== 'DRAIN' || typeof body.queueId !== 'string' || body.queueId.length < 30) {
    return jsonResponse({ error: 'Invalid request', code: 'INVALID_PUSH_REQUEST' }, 400);
  }

  const dispatchToken = request.headers.get('x-push-dispatch-token');
  if (!dispatchToken || dispatchToken !== runtime.dispatchToken) return notFound();
  const ready = await ensureVapidKeys(admin, runtime);
  if (!ready) return jsonResponse({ error: 'Push runtime unavailable', code: 'PUSH_RUNTIME_UNAVAILABLE' }, 503);
  return drainQueue(admin, body.queueId, ready);
});
