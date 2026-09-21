create table public.monthly_training_report_pdf_artifacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  snapshot_id uuid not null,
  period_start date not null,
  source_fingerprint text not null,
  pdf_version text not null default 'training-report-pdf-v1',
  storage_path text not null unique,
  byte_size bigint not null,
  sha256_hex text not null,
  generated_at timestamptz not null default now(),
  verified_at timestamptz not null default now(),
  pending_delete_path text,
  constraint monthly_training_report_pdf_artifacts_snapshot_user_fkey
    foreign key (snapshot_id, user_id)
    references public.monthly_training_report_source_snapshots(id, user_id)
    on delete cascade,
  constraint monthly_training_report_pdf_artifacts_month_start
    check (extract(day from period_start) = 1),
  constraint monthly_training_report_pdf_artifacts_pdf_version
    check (pdf_version = 'training-report-pdf-v1'),
  constraint monthly_training_report_pdf_artifacts_storage_path_owned
    check (
      char_length(storage_path) between 80 and 320
      and storage_path like user_id::text || '/' || snapshot_id::text || '/%.pdf'
    ),
  constraint monthly_training_report_pdf_artifacts_pending_path_owned
    check (
      pending_delete_path is null
      or (
        char_length(pending_delete_path) between 80 and 320
        and pending_delete_path like user_id::text || '/%.pdf'
      )
    ),
  constraint monthly_training_report_pdf_artifacts_byte_size
    check (byte_size > 0 and byte_size <= 8388608),
  constraint monthly_training_report_pdf_artifacts_sha256
    check (sha256_hex ~ '^[0-9a-f]{64}$')
);

create index monthly_training_report_pdf_artifacts_snapshot_idx
  on public.monthly_training_report_pdf_artifacts(snapshot_id);

alter table public.monthly_training_report_pdf_artifacts enable row level security;

create policy monthly_training_report_pdf_artifacts_select
on public.monthly_training_report_pdf_artifacts
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.monthly_training_report_pdf_artifacts
from public, anon, authenticated;

grant select on table public.monthly_training_report_pdf_artifacts
to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'monthly-training-reports',
  'monthly-training-reports',
  false,
  8388608,
  array['application/pdf']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists monthly_training_reports_select_own on storage.objects;
create policy monthly_training_reports_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'monthly-training-reports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists monthly_training_reports_insert_own on storage.objects;
create policy monthly_training_reports_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'monthly-training-reports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists monthly_training_reports_delete_own on storage.objects;
create policy monthly_training_reports_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'monthly-training-reports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.promote_my_monthly_training_report_pdf(
  p_snapshot_id uuid,
  p_storage_path text,
  p_byte_size bigint,
  p_sha256_hex text,
  p_pdf_version text default 'training-report-pdf-v1'
)
returns table (
  current_storage_path text,
  pending_delete_path text,
  period_start date,
  verified_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_snapshot public.monthly_training_report_source_snapshots%rowtype;
  v_existing public.monthly_training_report_pdf_artifacts%rowtype;
  v_object_size bigint;
  v_object_mimetype text;
  v_created boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_snapshot_id is null then
    raise exception 'Snapshot id is required' using errcode = '22023';
  end if;

  if p_pdf_version is distinct from 'training-report-pdf-v1' then
    raise exception 'Unsupported monthly PDF version' using errcode = '22023';
  end if;

  if p_byte_size is null or p_byte_size <= 0 or p_byte_size > 8388608 then
    raise exception 'Monthly PDF size is invalid' using errcode = '22023';
  end if;

  if p_sha256_hex is null or p_sha256_hex !~ '^[0-9a-f]{64}$' then
    raise exception 'Monthly PDF SHA-256 is invalid' using errcode = '22023';
  end if;

  select s.*
  into v_snapshot
  from public.monthly_training_report_source_snapshots s
  where s.id = p_snapshot_id
    and s.user_id = v_user_id;

  if not found then
    raise exception 'Frozen monthly report source was not found'
      using errcode = 'P0002';
  end if;

  if v_snapshot.verified_at is null or v_snapshot.source_fingerprint is null then
    raise exception 'Frozen monthly report source is not verified'
      using errcode = '55000';
  end if;

  if p_storage_path is null
     or char_length(p_storage_path) < 80
     or char_length(p_storage_path) > 320
     or p_storage_path not like (
       v_user_id::text || '/' || p_snapshot_id::text || '/%.pdf'
     ) then
    raise exception 'Monthly PDF storage path is invalid'
      using errcode = '22023';
  end if;

  select
    nullif(o.metadata ->> 'size', '')::bigint,
    o.metadata ->> 'mimetype'
  into v_object_size, v_object_mimetype
  from storage.objects o
  where o.bucket_id = 'monthly-training-reports'
    and o.name = p_storage_path
    and not o.is_delete_marker;

  if not found then
    raise exception 'Monthly PDF storage object was not found'
      using errcode = 'P0002';
  end if;

  if v_object_size is distinct from p_byte_size then
    raise exception 'Monthly PDF storage object size does not match'
      using errcode = '22023';
  end if;

  if v_object_mimetype is distinct from 'application/pdf' then
    raise exception 'Monthly PDF storage object MIME type is invalid'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(19991, hashtext(v_user_id::text));

  select a.*
  into v_existing
  from public.monthly_training_report_pdf_artifacts a
  where a.user_id = v_user_id
  for update;

  if found and v_existing.pending_delete_path is not null then
    if exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'monthly-training-reports'
        and o.name = v_existing.pending_delete_path
        and not o.is_delete_marker
    ) then
      raise exception 'Previous monthly PDF cleanup is still pending'
        using errcode = '55000';
    end if;

    update public.monthly_training_report_pdf_artifacts
    set pending_delete_path = null
    where user_id = v_user_id;

    v_existing.pending_delete_path := null;
  end if;

  if found and v_existing.period_start > v_snapshot.period_start then
    raise exception 'Cannot replace the latest monthly PDF with an older month'
      using errcode = '22023';
  end if;

  if found and v_existing.storage_path = p_storage_path then
    current_storage_path := v_existing.storage_path;
    pending_delete_path := v_existing.pending_delete_path;
    period_start := v_existing.period_start;
    verified_at := v_existing.verified_at;
    created := false;
    return next;
    return;
  end if;

  v_created := not found;

  insert into public.monthly_training_report_pdf_artifacts (
    user_id,
    snapshot_id,
    period_start,
    source_fingerprint,
    pdf_version,
    storage_path,
    byte_size,
    sha256_hex,
    generated_at,
    verified_at,
    pending_delete_path
  )
  values (
    v_user_id,
    v_snapshot.id,
    v_snapshot.period_start,
    v_snapshot.source_fingerprint,
    p_pdf_version,
    p_storage_path,
    p_byte_size,
    p_sha256_hex,
    now(),
    now(),
    case
      when v_existing.storage_path is not null
       and v_existing.storage_path <> p_storage_path
        then v_existing.storage_path
      else null
    end
  )
  on conflict (user_id) do update
  set snapshot_id = excluded.snapshot_id,
      period_start = excluded.period_start,
      source_fingerprint = excluded.source_fingerprint,
      pdf_version = excluded.pdf_version,
      storage_path = excluded.storage_path,
      byte_size = excluded.byte_size,
      sha256_hex = excluded.sha256_hex,
      generated_at = excluded.generated_at,
      verified_at = excluded.verified_at,
      pending_delete_path = excluded.pending_delete_path;

  select a.storage_path, a.pending_delete_path, a.period_start, a.verified_at
  into current_storage_path, pending_delete_path, period_start, verified_at
  from public.monthly_training_report_pdf_artifacts a
  where a.user_id = v_user_id;

  created := v_created;
  return next;
end;
$$;

revoke all on function public.promote_my_monthly_training_report_pdf(
  uuid, text, bigint, text, text
) from public, anon, authenticated;

grant execute on function public.promote_my_monthly_training_report_pdf(
  uuid, text, bigint, text, text
) to authenticated;

create or replace function public.confirm_my_monthly_training_report_pdf_cleanup(
  p_current_storage_path text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_artifact public.monthly_training_report_pdf_artifacts%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(19991, hashtext(v_user_id::text));

  select a.*
  into v_artifact
  from public.monthly_training_report_pdf_artifacts a
  where a.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Monthly PDF artifact was not found'
      using errcode = 'P0002';
  end if;

  if p_current_storage_path is distinct from v_artifact.storage_path then
    raise exception 'Monthly PDF current storage path does not match'
      using errcode = '22023';
  end if;

  if v_artifact.pending_delete_path is null then
    return true;
  end if;

  if exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'monthly-training-reports'
      and o.name = v_artifact.pending_delete_path
      and not o.is_delete_marker
  ) then
    raise exception 'Previous monthly PDF storage object still exists'
      using errcode = '55000';
  end if;

  update public.monthly_training_report_pdf_artifacts
  set pending_delete_path = null
  where user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.confirm_my_monthly_training_report_pdf_cleanup(text)
from public, anon, authenticated;

grant execute on function public.confirm_my_monthly_training_report_pdf_cleanup(text)
to authenticated;

comment on table public.monthly_training_report_pdf_artifacts is
  'Phase 19.9 current private monthly report PDF pointer. One row per user; frozen structured monthly snapshots remain the long-term historical source.';

comment on function public.promote_my_monthly_training_report_pdf(uuid, text, bigint, text, text) is
  'Promotes a verified user-owned private PDF candidate to the current retained monthly artifact. Refuses older-month replacement and preserves the previous path until cleanup is confirmed.';

comment on function public.confirm_my_monthly_training_report_pdf_cleanup(text) is
  'Clears the pending prior PDF path only after the previous private Storage object no longer exists.';

notify pgrst, 'reload schema';
