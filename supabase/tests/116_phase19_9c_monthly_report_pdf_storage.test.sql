begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

select has_table(
  'public',
  'monthly_training_report_pdf_artifacts',
  'monthly PDF artifact table exists'
);

select ok(
  (select relrowsecurity
   from pg_class c
   join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public'
     and c.relname='monthly_training_report_pdf_artifacts'),
  'monthly PDF artifact table has RLS enabled'
);

select is(
  has_table_privilege(
    'authenticated',
    'public.monthly_training_report_pdf_artifacts',
    'select'
  ),
  true,
  'authenticated can read its retained artifact row'
);

select is(
  has_table_privilege(
    'authenticated',
    'public.monthly_training_report_pdf_artifacts',
    'insert'
  ),
  false,
  'authenticated cannot directly insert retained artifact rows'
);

select is(
  has_table_privilege(
    'authenticated',
    'public.monthly_training_report_pdf_artifacts',
    'update'
  ),
  false,
  'authenticated cannot directly update retained artifact rows'
);

select is(
  has_table_privilege(
    'authenticated',
    'public.monthly_training_report_pdf_artifacts',
    'delete'
  ),
  false,
  'authenticated cannot directly delete retained artifact rows'
);

select results_eq(
  $$select public, file_size_limit, allowed_mime_types
    from storage.buckets
    where id='monthly-training-reports'$$,
  $$values (
    false,
    8388608::bigint,
    array['application/pdf']::text[]
  )$$,
  'monthly report bucket is private, bounded, and PDF-only'
);

select has_function(
  'public',
  'promote_my_monthly_training_report_pdf',
  array['uuid','text','bigint','text','text'],
  'monthly PDF promotion RPC exists'
);

select has_function(
  'public',
  'confirm_my_monthly_training_report_pdf_cleanup',
  array['text'],
  'monthly PDF cleanup confirmation RPC exists'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.promote_my_monthly_training_report_pdf(uuid,text,bigint,text,text)',
    'execute'
  ),
  true,
  'authenticated can execute PDF promotion'
);

select is(
  has_function_privilege(
    'anon',
    'public.promote_my_monthly_training_report_pdf(uuid,text,bigint,text,text)',
    'execute'
  ),
  false,
  'anon cannot execute PDF promotion'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.confirm_my_monthly_training_report_pdf_cleanup(text)',
    'execute'
  ),
  true,
  'authenticated can confirm its own PDF cleanup'
);

insert into auth.users (id,email) values
  ('199c0000-0000-4000-8000-000000000001','phase199c-primary@test.local'),
  ('299c0000-0000-4000-8000-000000000002','phase199c-other@test.local');

update public.profiles
set username='phase199c_primary',
    display_name='Phase 19.9C Primary',
    timezone='UTC',
    onboarding_completed_at=now()
where id='199c0000-0000-4000-8000-000000000001';

update public.profiles
set username='phase199c_other',
    display_name='Phase 19.9C Other',
    timezone='UTC',
    onboarding_completed_at=now()
where id='299c0000-0000-4000-8000-000000000002';

insert into public.monthly_training_report_source_snapshots (
  id,user_id,report_version,period_start,period_end,methodology_version,
  low_status_fraction_of_target_min,completed_lifting_sessions,
  active_training_seconds,exercise_count,completed_working_sets,
  volume_kg_reps,pr_count,source_fingerprint,verified_at
)
values
(
  '199c0000-0000-4000-8000-000000001001',
  '199c0000-0000-4000-8000-000000000001',
  'training-report-v1','2026-07-01','2026-07-31','muscle-volume-v1',
  0.5,1,3600,1,1,100,0,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',now()
),
(
  '199c0000-0000-4000-8000-000000001002',
  '199c0000-0000-4000-8000-000000000001',
  'training-report-v1','2026-08-01','2026-08-31','muscle-volume-v1',
  0.5,1,3600,1,1,100,0,'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',now()
);

insert into storage.objects (
  bucket_id,name,owner_id,metadata
)
values
(
  'monthly-training-reports',
  '199c0000-0000-4000-8000-000000000001/199c0000-0000-4000-8000-000000001002/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf',
  '199c0000-0000-4000-8000-000000000001',
  '{"size":2048,"mimetype":"application/pdf"}'::jsonb
),
(
  'monthly-training-reports',
  '199c0000-0000-4000-8000-000000000001/199c0000-0000-4000-8000-000000001002/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf',
  '199c0000-0000-4000-8000-000000000001',
  '{"size":2048,"mimetype":"application/pdf"}'::jsonb
),
(
  'monthly-training-reports',
  '199c0000-0000-4000-8000-000000000001/199c0000-0000-4000-8000-000000001001/cccccccc-cccc-4ccc-8ccc-cccccccccccc.pdf',
  '199c0000-0000-4000-8000-000000000001',
  '{"size":2048,"mimetype":"application/pdf"}'::jsonb
);

set local role authenticated;
set local request.jwt.claim.sub='199c0000-0000-4000-8000-000000000001';

select throws_ok(
  $$select * from public.promote_my_monthly_training_report_pdf(
      '199c0000-0000-4000-8000-000000001002',
      '199c0000-0000-4000-8000-000000000001/199c0000-0000-4000-8000-000000001002/missing.pdf',
      2048,
      repeat('a',64),
      'training-report-pdf-v1'
    )$$,
  'P0002',
  'Monthly PDF storage object was not found',
  'promotion rejects a missing candidate object'
);

select results_eq(
  $$select created,pending_delete_path
    from public.promote_my_monthly_training_report_pdf(
      '199c0000-0000-4000-8000-000000001002',
      '199c0000-0000-4000-8000-000000000001/199c0000-0000-4000-8000-000000001002/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf',
      2048,
      repeat('a',64),
      'training-report-pdf-v1'
    )$$,
  $$values (true,null::text)$$,
  'first verified candidate becomes the retained artifact'
);

select results_eq(
  $$select period_start,pdf_version,byte_size
    from public.monthly_training_report_pdf_artifacts$$,
  $$values ('2026-08-01'::date,'training-report-pdf-v1'::text,2048::bigint)$$,
  'retained artifact stores the verified month/version/size'
);

select results_eq(
  $$select created,pending_delete_path
    from public.promote_my_monthly_training_report_pdf(
      '199c0000-0000-4000-8000-000000001002',
      '199c0000-0000-4000-8000-000000000001/199c0000-0000-4000-8000-000000001002/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf',
      2048,
      repeat('b',64),
      'training-report-pdf-v1'
    )$$,
  $$values (
    false,
    '199c0000-0000-4000-8000-000000000001/199c0000-0000-4000-8000-000000001002/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf'::text
  )$$,
  'replacement preserves the prior path until cleanup is confirmed'
);

select throws_ok(
  $$select * from public.promote_my_monthly_training_report_pdf(
      '199c0000-0000-4000-8000-000000001002',
      '199c0000-0000-4000-8000-000000000001/199c0000-0000-4000-8000-000000001002/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf',
      2048,
      repeat('a',64),
      'training-report-pdf-v1'
    )$$,
  '55000',
  'Previous monthly PDF cleanup is still pending',
  'a second replacement is blocked while prior cleanup is unresolved'
);

select throws_ok(
  $$select public.confirm_my_monthly_training_report_pdf_cleanup(
    '199c0000-0000-4000-8000-000000000001/199c0000-0000-4000-8000-000000001002/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf'
  )$$,
  '55000',
  'Previous monthly PDF storage object still exists',
  'cleanup confirmation refuses to clear while the prior object still exists'
);

reset role;
update public.monthly_training_report_pdf_artifacts
set pending_delete_path =
  '199c0000-0000-4000-8000-000000000001/199c0000-0000-4000-8000-000000001002/nonexistent-old.pdf'
where user_id='199c0000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claim.sub='199c0000-0000-4000-8000-000000000001';

select is(
  public.confirm_my_monthly_training_report_pdf_cleanup(
    '199c0000-0000-4000-8000-000000000001/199c0000-0000-4000-8000-000000001002/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf'
  ),
  true,
  'cleanup confirmation succeeds once the pending prior path is absent from Storage'
);

select results_eq(
  $$select pending_delete_path
    from public.monthly_training_report_pdf_artifacts$$,
  $$values (null::text)$$,
  'cleanup confirmation clears the pending prior path'
);

select throws_ok(
  $$select * from public.promote_my_monthly_training_report_pdf(
      '199c0000-0000-4000-8000-000000001001',
      '199c0000-0000-4000-8000-000000000001/199c0000-0000-4000-8000-000000001001/cccccccc-cccc-4ccc-8ccc-cccccccccccc.pdf',
      2048,
      repeat('c',64),
      'training-report-pdf-v1'
    )$$,
  '22023',
  'Cannot replace the latest monthly PDF with an older month',
  'retention is monotonic and refuses an older-month replacement'
);

set local request.jwt.claim.sub='299c0000-0000-4000-8000-000000000002';

select results_eq(
  $$select count(*)::bigint
    from public.monthly_training_report_pdf_artifacts$$,
  array[0::bigint],
  'RLS hides another user retained artifact'
);

select throws_ok(
  $$select * from public.promote_my_monthly_training_report_pdf(
      '199c0000-0000-4000-8000-000000001002',
      '299c0000-0000-4000-8000-000000000002/199c0000-0000-4000-8000-000000001002/dddddddd-dddd-4ddd-8ddd-dddddddddddd.pdf',
      2048,
      repeat('d',64),
      'training-report-pdf-v1'
    )$$,
  'P0002',
  'Frozen monthly report source was not found',
  'promotion cannot adopt another user snapshot'
);

select * from finish();
rollback;
