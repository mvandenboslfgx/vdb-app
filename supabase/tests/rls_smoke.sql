-- Local RLS smoke checks (run against local Supabase only)
-- docker exec -i supabase_db_vdb-digital-mobile-local psql -U postgres -f - < supabase/tests/rls_smoke.sql

BEGIN;

-- Helper functions exist
SELECT public.has_app_role(ARRAY['customer']::text[]) IS NOT NULL AS has_app_role_ok;
SELECT public.is_staff_or_above() IS NOT NULL AS is_staff_ok;

-- RLS enabled on critical tables
SELECT COUNT(*) = 5 AS rls_enabled_ok
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_roles','projects','messages','commissions','documents')
  AND rowsecurity = true;

-- Fail-closed flags
SELECT bool_and(NOT enabled) AS financial_flags_off
FROM public.feature_flags
WHERE key IN ('mollie_checkout','digital_product_checkout','partner_payouts');

ROLLBACK;
