create extension if not exists pg_net;
create extension if not exists pg_cron;

create table private.push_runtime_config (
  singleton boolean primary key default true check (singleton),
  edge_function_url text,
  dispatch_token text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  vapid_public_key text,
  vapid_private_key text,
  updated_at timestamptz not null default now(),
  constraint push_runtime_config_edge_url check (
    edge_function_url is null
    or (edge_function_url like 'https://%' and char_length(edge_function_url) <= 500)
  ),
  constraint push_runtime_config_vapid_pair check (
    (vapid_public_key is null and vapid_private_key is null)
    or (vapid_public_key is not null and vapid_private_key is not null)
  )
);

insert into private.push_runtime_config (singleton)
values (true)
on conflict (singleton) do nothing;

create table private.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint push_subscriptions_endpoint_https check (
    endpoint like 'https://%' and char_length(endpoint) between 20 and 2048
  ),
  constraint push_subscriptions_p256dh_length check (char_length(p256dh) between 16 and 512),
  constraint push_subscriptions_auth_length check (char_length(auth_secret) between 8 and 256),
  constraint push_subscriptions_user_agent_length check (user_agent is null or char_length(user_agent) <= 500)
);

create index push_subscriptions_user_active_idx
on private.push_subscriptions (user_id, revoked_at, last_seen_at desc);

create table private.push_delivery_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in (
    'BADGE_ACHIEVEMENTS',
    'PERSONAL_RECORD_ALERTS',
    'GROUP_INVITATIONS',
    'TEST'
  )),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 280),
  target_path text not null default '/' check (
    target_path like '/%'
    and target_path not like '//%'
    and char_length(target_path) <= 300
  ),
  dedupe_key text not null unique check (char_length(dedupe_key) between 8 and 240),
  target_subscription_id uuid references private.push_subscriptions(id),
  status text not null default 'PENDING' check (status in (
    'PENDING', 'SENT', 'SUPPRESSED', 'NO_DEVICE', 'FAILED'
  )),
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  delivered_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_delivery_queue_error_code check (
    last_error_code is null or last_error_code ~ '^[A-Z][A-Z0-9_]{2,79}$'
  )
);

create index push_delivery_queue_pending_idx
on private.push_delivery_queue (status, available_at, created_at)
where status = 'PENDING';

create index push_delivery_queue_user_created_idx
on private.push_delivery_queue (user_id, created_at desc);

create table private.push_delivery_targets (
  queue_id uuid not null references private.push_delivery_queue(id) on delete cascade,
  subscription_id uuid not null references private.push_subscriptions(id),
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'EXPIRED', 'FAILED')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  sent_at timestamptz,
  last_error_code text,
  updated_at timestamptz not null default now(),
  primary key (queue_id, subscription_id),
  constraint push_delivery_targets_error_code check (
    last_error_code is null or last_error_code ~ '^[A-Z][A-Z0-9_]{2,79}$'
  )
);

alter table private.push_runtime_config enable row level security;
alter table private.push_subscriptions enable row level security;
alter table private.push_delivery_queue enable row level security;
alter table private.push_delivery_targets enable row level security;

revoke all on table private.push_runtime_config from public, anon, authenticated;
revoke all on table private.push_subscriptions from public, anon, authenticated;
revoke all on table private.push_delivery_queue from public, anon, authenticated;
revoke all on table private.push_delivery_targets from public, anon, authenticated;

comment on table private.push_subscriptions is
  'Private device-specific Web Push subscriptions. Endpoint/key capability data is never exposed directly to browser roles.';
comment on table private.push_delivery_queue is
  'Durable optional Web Push delivery queue. Mandatory in-app account/security/moderation messages are intentionally separate.';
comment on column private.push_runtime_config.vapid_private_key is
  'Server-only VAPID private key. Never returned to browser callers or bundled in the PWA.';

create or replace function private.notification_push_category_enabled(
  p_user_id uuid,
  p_category text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_category = 'TEST' then true
    when np.notifications_enabled is not true then false
    when p_category = 'BADGE_ACHIEVEMENTS' then np.badge_achievements
    when p_category = 'PERSONAL_RECORD_ALERTS' then np.personal_record_alerts
    when p_category = 'GROUP_INVITATIONS' then np.group_invitations
    else false
  end
  from public.notification_preferences np
  where np.user_id = p_user_id;
$$;

revoke all on function private.notification_push_category_enabled(uuid, text)
from public, anon, authenticated;

create or replace function private.enqueue_optional_push(
  p_user_id uuid,
  p_category text,
  p_title text,
  p_body text,
  p_target_path text,
  p_dedupe_key text,
  p_target_subscription_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_queue_id uuid;
  v_account_status public.platform_account_status;
begin
  select pas.status
  into v_account_status
  from private.platform_account_state pas
  where pas.user_id = p_user_id;

  if v_account_status is distinct from 'ACTIVE'::public.platform_account_status then
    return null;
  end if;

  if not coalesce(private.notification_push_category_enabled(p_user_id, p_category), false) then
    return null;
  end if;

  insert into private.push_delivery_queue (
    user_id,
    category,
    title,
    body,
    target_path,
    dedupe_key,
    target_subscription_id
  ) values (
    p_user_id,
    p_category,
    p_title,
    p_body,
    p_target_path,
    p_dedupe_key,
    p_target_subscription_id
  )
  on conflict (dedupe_key) do nothing
  returning id into v_queue_id;

  if v_queue_id is null then
    select q.id into v_queue_id
    from private.push_delivery_queue q
    where q.dedupe_key = p_dedupe_key;
  end if;

  return v_queue_id;
end;
$$;

revoke all on function private.enqueue_optional_push(uuid, text, text, text, text, text, uuid)
from public, anon, authenticated;

create or replace function public.register_my_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth_secret text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_subscription_id uuid;
  v_user_agent text;
begin
  perform private.require_active_account();
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_endpoint is null
     or p_endpoint not like 'https://%'
     or char_length(p_endpoint) not between 20 and 2048
     or p_p256dh is null
     or char_length(p_p256dh) not between 16 and 512
     or p_auth_secret is null
     or char_length(p_auth_secret) not between 8 and 256 then
    raise exception using errcode = '22023', message = 'Invalid push subscription';
  end if;

  v_user_agent := nullif(left(coalesce(p_user_agent, ''), 500), '');

  insert into private.push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth_secret,
    user_agent,
    last_seen_at,
    revoked_at
  ) values (
    v_user_id,
    p_endpoint,
    p_p256dh,
    p_auth_secret,
    v_user_agent,
    now(),
    null
  )
  on conflict (endpoint) do update
  set user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth_secret = excluded.auth_secret,
      user_agent = excluded.user_agent,
      updated_at = now(),
      last_seen_at = now(),
      revoked_at = null
  returning id into v_subscription_id;

  return v_subscription_id;
end;
$$;

revoke all on function public.register_my_push_subscription(text, text, text, text)
from public, anon, authenticated;
grant execute on function public.register_my_push_subscription(text, text, text, text)
to authenticated;

create or replace function public.revoke_my_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_changed integer;
begin
  perform private.require_active_account();
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  update private.push_subscriptions
  set revoked_at = coalesce(revoked_at, now()),
      updated_at = now()
  where user_id = v_user_id
    and endpoint = p_endpoint
    and revoked_at is null;
  get diagnostics v_changed = row_count;
  return v_changed > 0;
end;
$$;

revoke all on function public.revoke_my_push_subscription(text)
from public, anon, authenticated;
grant execute on function public.revoke_my_push_subscription(text)
to authenticated;

create or replace function public.get_my_push_device_summary()
returns table(active_device_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  perform private.require_active_account();
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  return query
  select count(*)::integer
  from private.push_subscriptions ps
  where ps.user_id = v_user_id
    and ps.revoked_at is null;
end;
$$;

revoke all on function public.get_my_push_device_summary()
from public, anon, authenticated;
grant execute on function public.get_my_push_device_summary()
to authenticated;

create or replace function public.enqueue_my_push_test(p_endpoint text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_subscription_id uuid;
  v_recent_count integer;
  v_queue_id uuid;
begin
  perform private.require_active_account();
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select ps.id into v_subscription_id
  from private.push_subscriptions ps
  where ps.user_id = v_user_id
    and ps.endpoint = p_endpoint
    and ps.revoked_at is null;

  if v_subscription_id is null then
    raise exception using errcode = '22023', message = 'Push subscription is not registered';
  end if;

  select count(*)::integer into v_recent_count
  from private.push_delivery_queue q
  where q.user_id = v_user_id
    and q.category = 'TEST'
    and q.created_at >= now() - interval '1 minute';

  if v_recent_count >= 3 then
    raise exception using errcode = 'P0001', message = 'Push test rate limit reached';
  end if;

  v_queue_id := private.enqueue_optional_push(
    v_user_id,
    'TEST',
    'Workout Game notifications',
    'This device is ready to receive Workout Game notifications.',
    '/settings',
    format('push-test:%s:%s', v_user_id, gen_random_uuid()),
    v_subscription_id
  );

  return v_queue_id;
end;
$$;

revoke all on function public.enqueue_my_push_test(text)
from public, anon, authenticated;
grant execute on function public.enqueue_my_push_test(text)
to authenticated;

create or replace function public.get_push_delivery_runtime()
returns table(
  edge_function_url text,
  dispatch_token text,
  vapid_public_key text,
  vapid_private_key text
)
language sql
security definer
set search_path = ''
as $$
  select c.edge_function_url, c.dispatch_token, c.vapid_public_key, c.vapid_private_key
  from private.push_runtime_config c
  where c.singleton;
$$;

revoke all on function public.get_push_delivery_runtime()
from public, anon, authenticated;
grant execute on function public.get_push_delivery_runtime()
to service_role;

create or replace function public.configure_push_delivery_runtime(p_edge_function_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_edge_function_url is null
     or p_edge_function_url not like 'https://%'
     or char_length(p_edge_function_url) > 500 then
    raise exception using errcode = '22023', message = 'Invalid push Edge Function URL';
  end if;

  update private.push_runtime_config
  set edge_function_url = p_edge_function_url,
      updated_at = now()
  where singleton;
end;
$$;

revoke all on function public.configure_push_delivery_runtime(text)
from public, anon, authenticated;
grant execute on function public.configure_push_delivery_runtime(text)
to service_role;

create or replace function public.initialize_push_vapid_keys(
  p_public_key text,
  p_private_key text
)
returns table(vapid_public_key text, vapid_private_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_public text;
  v_private text;
begin
  if p_public_key is null or char_length(p_public_key) < 32
     or p_private_key is null or char_length(p_private_key) < 24 then
    raise exception using errcode = '22023', message = 'Invalid VAPID key pair';
  end if;

  select c.vapid_public_key, c.vapid_private_key
  into v_public, v_private
  from private.push_runtime_config c
  where c.singleton
  for update;

  if (v_public is null) <> (v_private is null) then
    raise exception using errcode = '55000', message = 'Push VAPID runtime is inconsistent';
  end if;

  if v_public is null then
    update private.push_runtime_config
    set vapid_public_key = p_public_key,
        vapid_private_key = p_private_key,
        updated_at = now()
    where singleton;
    v_public := p_public_key;
    v_private := p_private_key;
  end if;

  return query select v_public, v_private;
end;
$$;

revoke all on function public.initialize_push_vapid_keys(text, text)
from public, anon, authenticated;
grant execute on function public.initialize_push_vapid_keys(text, text)
to service_role;

create or replace function public.prepare_push_delivery(p_queue_id uuid)
returns table(
  queue_id uuid,
  category text,
  title text,
  body text,
  target_path text,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth_secret text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_queue private.push_delivery_queue%rowtype;
  v_account_status public.platform_account_status;
  v_enabled boolean;
  v_target_count integer;
begin
  select q.* into v_queue
  from private.push_delivery_queue q
  where q.id = p_queue_id
  for update;

  if not found or v_queue.status <> 'PENDING' then
    return;
  end if;

  if v_queue.available_at > now() then
    return;
  end if;

  if v_queue.attempt_count >= 5 then
    update private.push_delivery_queue
    set status = 'FAILED',
        last_error_code = 'RETRY_LIMIT_REACHED',
        locked_at = null,
        updated_at = now()
    where id = p_queue_id;
    return;
  end if;

  select pas.status into v_account_status
  from private.platform_account_state pas
  where pas.user_id = v_queue.user_id;

  v_enabled := v_account_status = 'ACTIVE'::public.platform_account_status
    and coalesce(private.notification_push_category_enabled(v_queue.user_id, v_queue.category), false);

  if not v_enabled then
    update private.push_delivery_queue
    set status = 'SUPPRESSED',
        locked_at = null,
        updated_at = now()
    where id = p_queue_id;
    return;
  end if;

  update private.push_delivery_queue
  set attempt_count = attempt_count + 1,
      locked_at = now(),
      last_error_code = null,
      updated_at = now()
  where id = p_queue_id;

  insert into private.push_delivery_targets (queue_id, subscription_id)
  select v_queue.id, ps.id
  from private.push_subscriptions ps
  where ps.user_id = v_queue.user_id
    and ps.revoked_at is null
    and (v_queue.target_subscription_id is null or ps.id = v_queue.target_subscription_id)
  on conflict (queue_id, subscription_id) do nothing;

  select count(*)::integer into v_target_count
  from private.push_delivery_targets t
  join private.push_subscriptions ps on ps.id = t.subscription_id
  where t.queue_id = p_queue_id
    and t.status = 'PENDING'
    and t.attempt_count < 5
    and ps.revoked_at is null;

  if v_target_count = 0 then
    update private.push_delivery_queue
    set status = case
          when exists (
            select 1 from private.push_delivery_targets t
            where t.queue_id = p_queue_id and t.status = 'SENT'
          ) then 'SENT'
          else 'NO_DEVICE'
        end,
        delivered_at = case
          when exists (
            select 1 from private.push_delivery_targets t
            where t.queue_id = p_queue_id and t.status = 'SENT'
          ) then now()
          else delivered_at
        end,
        locked_at = null,
        updated_at = now()
    where id = p_queue_id;
    return;
  end if;

  return query
  select
    v_queue.id,
    v_queue.category,
    v_queue.title,
    v_queue.body,
    v_queue.target_path,
    ps.id,
    ps.endpoint,
    ps.p256dh,
    ps.auth_secret
  from private.push_delivery_targets t
  join private.push_subscriptions ps on ps.id = t.subscription_id
  where t.queue_id = p_queue_id
    and t.status = 'PENDING'
    and t.attempt_count < 5
    and ps.revoked_at is null
  order by ps.created_at;
end;
$$;

revoke all on function public.prepare_push_delivery(uuid)
from public, anon, authenticated;
grant execute on function public.prepare_push_delivery(uuid)
to service_role;

create or replace function public.record_push_delivery_result(
  p_queue_id uuid,
  p_subscription_id uuid,
  p_outcome text,
  p_error_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
  v_pending boolean;
  v_sent boolean;
begin
  if p_outcome not in ('SENT', 'EXPIRED', 'RETRY', 'FAILED') then
    raise exception using errcode = '22023', message = 'Invalid push delivery outcome';
  end if;

  if p_error_code is not null and p_error_code !~ '^[A-Z][A-Z0-9_]{2,79}$' then
    raise exception using errcode = '22023', message = 'Invalid push error code';
  end if;

  select t.attempt_count into v_attempts
  from private.push_delivery_targets t
  where t.queue_id = p_queue_id and t.subscription_id = p_subscription_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Push delivery target not found';
  end if;

  v_attempts := v_attempts + 1;

  update private.push_delivery_targets
  set attempt_count = v_attempts,
      status = case
        when p_outcome = 'SENT' then 'SENT'
        when p_outcome = 'EXPIRED' then 'EXPIRED'
        when p_outcome = 'RETRY' and v_attempts < 5 then 'PENDING'
        else 'FAILED'
      end,
      sent_at = case when p_outcome = 'SENT' then now() else sent_at end,
      last_error_code = p_error_code,
      updated_at = now()
  where queue_id = p_queue_id and subscription_id = p_subscription_id;

  if p_outcome = 'EXPIRED' then
    update private.push_subscriptions
    set revoked_at = coalesce(revoked_at, now()), updated_at = now()
    where id = p_subscription_id;
  end if;

  select exists (
    select 1 from private.push_delivery_targets t
    where t.queue_id = p_queue_id and t.status = 'PENDING' and t.attempt_count < 5
  ) into v_pending;

  select exists (
    select 1 from private.push_delivery_targets t
    where t.queue_id = p_queue_id and t.status = 'SENT'
  ) into v_sent;

  if v_pending then
    update private.push_delivery_queue
    set status = 'PENDING',
        available_at = now() + interval '1 minute',
        locked_at = null,
        last_error_code = p_error_code,
        updated_at = now()
    where id = p_queue_id;
  else
    update private.push_delivery_queue
    set status = case when v_sent then 'SENT' else 'FAILED' end,
        delivered_at = case when v_sent then coalesce(delivered_at, now()) else delivered_at end,
        locked_at = null,
        last_error_code = case when v_sent then null else p_error_code end,
        updated_at = now()
    where id = p_queue_id;
  end if;
end;
$$;

revoke all on function public.record_push_delivery_result(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.record_push_delivery_result(uuid, uuid, text, text)
to service_role;

create or replace function private.dispatch_push_delivery(p_queue_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_token text;
  v_request_id bigint;
begin
  select c.edge_function_url, c.dispatch_token
  into v_url, v_token
  from private.push_runtime_config c
  where c.singleton;

  if v_url is null then
    return null;
  end if;

  select net.http_post(
    url := v_url,
    body := jsonb_build_object('action', 'DRAIN', 'queueId', p_queue_id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-dispatch-token', v_token
    ),
    timeout_milliseconds := 5000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function private.dispatch_push_delivery(uuid)
from public, anon, authenticated;

create or replace function private.push_queue_dispatch_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.dispatch_push_delivery(new.id);
  return new;
end;
$$;

revoke all on function private.push_queue_dispatch_trigger()
from public, anon, authenticated;

create trigger push_delivery_queue_dispatch
after insert on private.push_delivery_queue
for each row execute function private.push_queue_dispatch_trigger();

create or replace function private.dispatch_pending_push_deliveries()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_queue_id uuid;
  v_count integer := 0;
begin
  for v_queue_id in
    select q.id
    from private.push_delivery_queue q
    where q.status = 'PENDING'
      and q.available_at <= now()
      and (q.locked_at is null or q.locked_at < now() - interval '5 minutes')
      and q.attempt_count < 5
    order by q.available_at, q.created_at
    limit 25
  loop
    perform private.dispatch_push_delivery(v_queue_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function private.dispatch_pending_push_deliveries()
from public, anon, authenticated;

select cron.schedule(
  'fitness-push-delivery',
  '* * * * *',
  'select private.dispatch_pending_push_deliveries();'
);

create or replace function private.enqueue_badge_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_optional_push(
    new.user_id,
    'BADGE_ACHIEVEMENTS',
    'Achievement unlocked',
    'You earned a new badge. Open Workout Game to see it.',
    '/',
    format('badge:%s:%s', new.user_id, new.badge_key),
    null
  );
  return new;
end;
$$;

revoke all on function private.enqueue_badge_push()
from public, anon, authenticated;

create trigger user_badges_enqueue_push
after insert on public.user_badges
for each row execute function private.enqueue_badge_push();

create or replace function private.enqueue_personal_record_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exercise_name text;
begin
  if new.event_type <> 'EXERCISE_PROGRESS'::public.scoring_event_type then
    return new;
  end if;

  select ec.canonical_name into v_exercise_name
  from public.exercise_catalog ec
  where ec.id = new.exercise_id;

  perform private.enqueue_optional_push(
    new.user_id,
    'PERSONAL_RECORD_ALERTS',
    'New personal record',
    case
      when v_exercise_name is null then 'A personal best just improved. Open Progress to see it.'
      else left(v_exercise_name || ' improved. Open Progress to see your latest best.', 280)
    end,
    '/?section=progress',
    format('personal-record:%s', new.id),
    null
  );
  return new;
end;
$$;

revoke all on function private.enqueue_personal_record_push()
from public, anon, authenticated;

create trigger scoring_events_enqueue_personal_record_push
after insert on public.scoring_events
for each row execute function private.enqueue_personal_record_push();

create or replace function private.enqueue_group_invitation_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_name text;
  v_inviter_name text;
begin
  select g.name into v_group_name
  from public.groups g
  where g.id = new.group_id;

  select p.display_name into v_inviter_name
  from public.profiles p
  where p.id = new.created_by;

  perform private.enqueue_optional_push(
    new.invited_user_id,
    'GROUP_INVITATIONS',
    'Group invitation',
    left(
      coalesce(v_inviter_name, 'Someone') || ' invited you to join ' || coalesce(v_group_name, 'a group') || '.',
      280
    ),
    '/?section=groups',
    format('group-invite:%s', new.id),
    null
  );
  return new;
end;
$$;

revoke all on function private.enqueue_group_invitation_push()
from public, anon, authenticated;

create trigger group_invites_enqueue_push
after insert on public.group_invites
for each row execute function private.enqueue_group_invitation_push();

comment on function public.register_my_push_subscription(text, text, text, text) is
  'Registers or refreshes the current authenticated account device Web Push subscription. A shared-browser endpoint transfers to the current account to avoid cross-account delivery.';
comment on function public.prepare_push_delivery(uuid) is
  'Service-role-only delivery preparation. Re-checks active account state and current optional preferences at send time.';
