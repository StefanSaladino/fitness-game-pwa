-- Compatibility sentinel only.
--
-- Historical hosted validation temporarily used this filename for a concatenated
-- copy of every pgTAP suite. That produced multiple TAP plans when discovered by
-- `supabase test db` and made GitHub's database job fail even when the canonical
-- suites themselves were valid.
--
-- Canonical database tests are the files matching:
--   supabase/tests/*.test.sql
--
-- GitHub CI and the optional local Docker runner select those files explicitly.
-- Do not concatenate pgTAP suites into this file again.

begin;
create extension if not exists pgtap with schema extensions;
select plan(1);
select pass('_all-hosted-tests.sql is a non-aggregate compatibility sentinel');
select * from finish();
rollback;
