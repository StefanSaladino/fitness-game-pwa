import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.112.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type AccountAuthAction = 'SUSPEND' | 'RESTORE';

type TransitionBody = {
  action?: unknown;
  userId?: unknown;
  reason?: unknown;
  reviewAt?: unknown;
};

type PreparedTransition = {
  coordination_revision: number | string;
  desired_banned: boolean;
  account_status: 'ACTIVE' | 'SUSPENDED' | 'DELETION_PENDING';
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

function serviceClient(): SupabaseClient | null {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function activePlatformAdminId(authorization: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = resolvePublishableKey();
  const token = authorization.slice('Bearer '.length).trim();
  if (!supabaseUrl || !publishableKey || !token) return null;

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: userResult, error: userError } = await caller.auth.getUser(token);
  if (userError || !userResult.user) return null;

  const { data: accessRows, error: accessError } = await caller.rpc('get_my_platform_access');
  if (accessError || !Array.isArray(accessRows) || accessRows.length !== 1) return null;

  const access = accessRows[0] as { account_status?: unknown; is_platform_admin?: unknown };
  if (access.account_status !== 'ACTIVE' || access.is_platform_admin !== true) return null;
  return userResult.user.id;
}

function parseBody(value: TransitionBody): {
  action: AccountAuthAction;
  userId: string;
  reason: string;
  reviewAt: string | null;
} | null {
  if (value.action !== 'SUSPEND' && value.action !== 'RESTORE') return null;
  if (typeof value.userId !== 'string' || value.userId.trim().length === 0) return null;
  if (typeof value.reason !== 'string') return null;
  if (value.reviewAt !== undefined && value.reviewAt !== null && typeof value.reviewAt !== 'string') {
    return null;
  }

  return {
    action: value.action,
    userId: value.userId.trim(),
    reason: value.reason,
    reviewAt: value.reviewAt ?? null,
  };
}

function preparedRow(value: unknown): PreparedTransition | null {
  const row = Array.isArray(value) ? value[0] : null;
  if (!row || typeof row !== 'object') return null;
  const prepared = row as Partial<PreparedTransition>;
  const revision = Number(prepared.coordination_revision);
  if (!Number.isSafeInteger(revision) || revision < 1) return null;
  if (typeof prepared.desired_banned !== 'boolean') return null;
  if (!['ACTIVE', 'SUSPENDED', 'DELETION_PENDING'].includes(String(prepared.account_status))) return null;
  return prepared as PreparedTransition;
}

async function recordCompletion(
  client: SupabaseClient,
  actorUserId: string,
  targetUserId: string,
  revision: number,
  success: boolean,
  errorCode: string | null,
) {
  return client.rpc('complete_platform_account_auth_transition', {
    p_actor_user_id: actorUserId,
    p_target_user_id: targetUserId,
    p_coordination_revision: revision,
    p_success: success,
    p_error_code: errorCode,
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return notFound();

  const actorUserId = await activePlatformAdminId(authorization);
  if (!actorUserId) return notFound();

  let rawBody: TransitionBody;
  try {
    rawBody = await request.json() as TransitionBody;
  } catch {
    return jsonResponse({ error: 'Invalid request', code: 'INVALID_ACCOUNT_AUTH_REQUEST' }, 400);
  }

  const body = parseBody(rawBody);
  if (!body) return jsonResponse({ error: 'Invalid request', code: 'INVALID_ACCOUNT_AUTH_REQUEST' }, 400);

  const admin = serviceClient();
  if (!admin) {
    return jsonResponse({ error: 'Account Auth service unavailable', code: 'ACCOUNT_AUTH_UNAVAILABLE' }, 503);
  }

  const { data: preparedData, error: prepareError } = await admin.rpc(
    'prepare_platform_account_auth_transition',
    {
      p_actor_user_id: actorUserId,
      p_target_user_id: body.userId,
      p_action: body.action,
      p_reason: body.reason,
      p_review_at: body.action === 'SUSPEND' ? body.reviewAt : null,
    },
  );
  const prepared = preparedRow(preparedData);
  if (prepareError || !prepared) {
    console.error('Account Auth transition preparation failed', prepareError?.code ?? 'INVALID_RESULT');
    return jsonResponse({ error: 'Account transition rejected', code: 'ACCOUNT_AUTH_TRANSITION_REJECTED' }, 409);
  }

  const revision = Number(prepared.coordination_revision);
  const banDuration = body.action === 'SUSPEND' ? '876000h' : 'none';
  const { error: authError } = await admin.auth.admin.updateUserById(body.userId, {
    ban_duration: banDuration,
  });

  if (authError) {
    console.error('Supabase Auth ban coordination failed', authError.code ?? 'AUTH_ADMIN_UPDATE_FAILED');
    const completion = await recordCompletion(
      admin,
      actorUserId,
      body.userId,
      revision,
      false,
      'AUTH_ADMIN_UPDATE_FAILED',
    );
    if (completion.error) {
      console.error('Auth failure recording failed', completion.error.code ?? 'COMPLETION_FAILED');
    }
    return jsonResponse({ error: 'Auth coordination failed', code: 'AUTH_COORDINATION_FAILED' }, 502);
  }

  const completion = await recordCompletion(
    admin,
    actorUserId,
    body.userId,
    revision,
    true,
    null,
  );
  if (completion.error) {
    console.error('Account Auth transition completion failed', completion.error.code ?? 'COMPLETION_FAILED');
    return jsonResponse({ error: 'Account transition incomplete', code: 'ACCOUNT_AUTH_COMPLETION_FAILED' }, 503);
  }

  return jsonResponse({
    accountStatus: completion.data,
    authBanned: prepared.desired_banned,
  });
});
