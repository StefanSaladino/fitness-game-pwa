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
  on conflict on constraint push_delivery_targets_pkey do nothing;

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
