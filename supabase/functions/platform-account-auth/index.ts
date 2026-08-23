import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.112.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type AccountAuthAction =
  | 'SUSPEND'
  | 'RESTORE'
  | 'DELETE_ADMIN'
  | 'DELETE_SELF'
  | 'CANCEL_DELETE_SELF';

type TransitionBody = {
  action?: unknown;
  userId?: unknown;
  reason?: unknown;
  reviewAt?: unknown;
  confirmation?: unknown;
};

type ParsedRequest =
  | {
    action: 'SUSPEND' | 'RESTORE';
    userId: string;
    reason: string;
    reviewAt: string | null;
  }
  | {
    action: 'DELETE_ADMIN';
    userId: string;
    confirmation: string;
  }
  | {
    action: 'DELETE_SELF';
    confirmation: string;
  }
  | {
    action: 'CANCEL_DELETE_SELF';
  };

type PreparedTransition = {
  coordination_revision: number | string;
  desired_banned: boolean;
  account_status: 'ACTIVE' | 'SUSPENDED' | 'DELETION_PENDING';
};

type PreparedDeletion = {
  deletion_revision: number | string;
  storage_prefix: string;
  storage_cleanup_required: boolean;
};

type StorageListEntry = {
  id?: string | null;
  metadata?: unknown | null;
  name?: unknown;
};

const PROFILE_PICTURE_BUCKET = 'profile-pictures';
const STORAGE_PAGE_SIZE = 1000;

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

async function authenticatedUserId(authorization: string): Promise<string | null> {
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

  return userResult.user.id;
}

async function activePlatformAdminId(authorization: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = resolvePublishableKey();
  if (!supabaseUrl || !publishableKey) return null;

  const callerUserId = await authenticatedUserId(authorization);
  if (!callerUserId) return null;

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: accessRows, error: accessError } = await caller.rpc('get_my_platform_access');
  if (accessError || !Array.isArray(accessRows) || accessRows.length !== 1) return null;

  const access = accessRows[0] as { account_status?: unknown; is_platform_admin?: unknown };
  if (access.account_status !== 'ACTIVE' || access.is_platform_admin !== true) return null;
  return callerUserId;
}

function parseBody(value: TransitionBody): ParsedRequest | null {
  const action = value.action as AccountAuthAction;

  if (action === 'CANCEL_DELETE_SELF') return { action };

  if (action === 'DELETE_SELF') {
    if (typeof value.confirmation !== 'string' || value.confirmation.length === 0) return null;
    return { action, confirmation: value.confirmation };
  }

  if (action === 'DELETE_ADMIN') {
    if (typeof value.userId !== 'string' || value.userId.trim().length === 0) return null;
    if (typeof value.confirmation !== 'string' || value.confirmation.length === 0) return null;
    return {
      action,
      userId: value.userId.trim(),
      confirmation: value.confirmation,
    };
  }

  if (action !== 'SUSPEND' && action !== 'RESTORE') return null;
  if (typeof value.userId !== 'string' || value.userId.trim().length === 0) return null;
  if (typeof value.reason !== 'string') return null;
  if (value.reviewAt !== undefined && value.reviewAt !== null && typeof value.reviewAt !== 'string') return null;

  return {
    action,
    userId: value.userId.trim(),
    reason: value.reason,
    reviewAt: value.reviewAt ?? null,
  };
}

function preparedDeletionRow(value: unknown): PreparedDeletion | null {
  const row = Array.isArray(value) ? value[0] : null;
  if (!row || typeof row !== 'object') return null;
  const prepared = row as Partial<PreparedDeletion>;
  const revision = Number(prepared.deletion_revision);
  if (!Number.isSafeInteger(revision) || revision < 1) return null;
  if (typeof prepared.storage_prefix !== 'string' || prepared.storage_prefix.length === 0) return null;
  if (typeof prepared.storage_cleanup_required !== 'boolean') return null;
  return prepared as PreparedDeletion;
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

async function recordDeletionFailure(
  client: SupabaseClient,
  actorUserId: string,
  targetUserId: string,
  revision: number,
  errorCode: string,
) {
  const failure = await client.rpc('record_platform_account_deletion_failure', {
    p_actor_user_id: actorUserId,
    p_target_user_id: targetUserId,
    p_deletion_revision: revision,
    p_error_code: errorCode,
  });
  if (failure.error) {
    console.error('Account deletion failure recording failed', failure.error.code ?? 'FAILURE_RECORD_FAILED');
  }
}

async function removeProfilePictures(client: SupabaseClient, storagePrefix: string): Promise<void> {
  const storage = client.storage.from(PROFILE_PICTURE_BUCKET);
  const pendingFolders = [storagePrefix];
  const visitedFolders = new Set<string>();
  const objectPaths: string[] = [];

  while (pendingFolders.length > 0) {
    const folder = pendingFolders.shift()!;
    if (visitedFolders.has(folder)) continue;
    visitedFolders.add(folder);

    let offset = 0;
    while (true) {
      const { data, error } = await storage.list(folder, {
        limit: STORAGE_PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;

      const entries = (data ?? []) as StorageListEntry[];
      for (const entry of entries) {
        if (typeof entry.name !== 'string' || entry.name.length === 0) continue;
        const path = `${folder}/${entry.name}`;
        if (entry.id == null && entry.metadata == null) pendingFolders.push(path);
        else objectPaths.push(path);
      }

      if (entries.length < STORAGE_PAGE_SIZE) break;
      offset += STORAGE_PAGE_SIZE;
    }
  }

  for (let index = 0; index < objectPaths.length; index += STORAGE_PAGE_SIZE) {
    const batch = objectPaths.slice(index, index + STORAGE_PAGE_SIZE);
    const { error } = await storage.remove(batch);
    if (error) throw error;
  }
}

async function deleteAccount(
  client: SupabaseClient,
  actorUserId: string,
  targetUserId: string,
  mode: 'ADMIN' | 'SELF',
  confirmation: string,
): Promise<Response> {
  const { data, error } = await client.rpc('prepare_platform_account_deletion', {
    p_actor_user_id: actorUserId,
    p_target_user_id: targetUserId,
    p_mode: mode,
    p_confirmation: confirmation,
  });
  const prepared = preparedDeletionRow(data);
  if (error || !prepared) {
    console.error('Account deletion preparation failed', error?.code ?? 'INVALID_RESULT');
    return jsonResponse({ error: 'Account deletion rejected', code: 'ACCOUNT_DELETION_REJECTED' }, 409);
  }

  const revision = Number(prepared.deletion_revision);
  if (prepared.storage_cleanup_required) {
    try {
      await removeProfilePictures(client, prepared.storage_prefix);
    } catch (storageError) {
      console.error('Profile-picture cleanup failed', storageError);
      await recordDeletionFailure(client, actorUserId, targetUserId, revision, 'STORAGE_CLEANUP_FAILED');
      return jsonResponse({ error: 'Account deletion incomplete', code: 'STORAGE_CLEANUP_FAILED' }, 502);
    }

    const storageCompletion = await client.rpc('mark_platform_account_deletion_storage_cleared', {
      p_actor_user_id: actorUserId,
      p_target_user_id: targetUserId,
      p_deletion_revision: revision,
    });
    if (storageCompletion.error) {
      console.error('Storage cleanup completion failed', storageCompletion.error.code ?? 'STORAGE_COMPLETION_FAILED');
      return jsonResponse({ error: 'Account deletion incomplete', code: 'ACCOUNT_DELETION_STALE' }, 409);
    }
  }

  const { error: authDeleteError } = await client.auth.admin.deleteUser(targetUserId, false);
  if (authDeleteError) {
    console.error('Supabase Auth deletion failed', authDeleteError.code ?? 'AUTH_ADMIN_DELETE_FAILED');
    await recordDeletionFailure(client, actorUserId, targetUserId, revision, 'AUTH_ADMIN_DELETE_FAILED');
    return jsonResponse({ error: 'Account deletion incomplete', code: 'AUTH_DELETE_FAILED' }, 502);
  }

  return jsonResponse({ deleted: true });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return notFound();

  let rawBody: TransitionBody;
  try {
    rawBody = await request.json() as TransitionBody;
  } catch {
    return jsonResponse({ error: 'Invalid request', code: 'INVALID_ACCOUNT_AUTH_REQUEST' }, 400);
  }

  const body = parseBody(rawBody);
  if (!body) return jsonResponse({ error: 'Invalid request', code: 'INVALID_ACCOUNT_AUTH_REQUEST' }, 400);

  const authenticatedActorId = await authenticatedUserId(authorization);
  if (!authenticatedActorId) return notFound();

  const admin = serviceClient();
  if (!admin) {
    return jsonResponse({ error: 'Account Auth service unavailable', code: 'ACCOUNT_AUTH_UNAVAILABLE' }, 503);
  }

  if (body.action === 'CANCEL_DELETE_SELF') {
    const cancellation = await admin.rpc('cancel_own_platform_account_deletion', {
      p_actor_user_id: authenticatedActorId,
      p_reason: 'User cancelled account deletion',
    });
    if (cancellation.error) {
      console.error('Self-deletion cancellation failed', cancellation.error.code ?? 'CANCELLATION_FAILED');
      return jsonResponse({ error: 'Account deletion cancellation rejected', code: 'DELETION_CANCELLATION_REJECTED' }, 409);
    }
    return jsonResponse({ accountStatus: cancellation.data });
  }

  if (body.action === 'DELETE_SELF') {
    return deleteAccount(
      admin,
      authenticatedActorId,
      authenticatedActorId,
      'SELF',
      body.confirmation,
    );
  }

  const actorUserId = await activePlatformAdminId(authorization);
  if (!actorUserId || actorUserId !== authenticatedActorId) return notFound();

  if (body.action === 'DELETE_ADMIN') {
    return deleteAccount(admin, actorUserId, body.userId, 'ADMIN', body.confirmation);
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
