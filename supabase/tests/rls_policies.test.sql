-- STATUS: NOT APPLIED — local proposal only. Requires explicit owner approval before remote apply.
-- RLS smoke tests (pgTAP-style). Run against LOCAL Supabase only:
--   psql $DATABASE_URL -f supabase/tests/rls_policies.test.sql
--
-- These tests assume migrations have been applied locally and use temporary auth.uid() stubs.
-- They are intentionally conservative: they assert policy presence and helper functions.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(20);

-- Helper functions exist
SELECT has_function('public', 'is_staff_or_above', ARRAY[]::text[], 'is_staff_or_above exists');
SELECT has_function('public', 'is_partner', ARRAY[]::text[], 'is_partner exists');
SELECT has_function('public', 'has_app_role', ARRAY['text[]'], 'has_app_role exists');
SELECT has_function('public', 'is_project_member', ARRAY['uuid'], 'is_project_member exists');
SELECT has_function('public', 'current_partner_id', ARRAY[]::text[], 'current_partner_id exists');

-- Tables have RLS enabled
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_roles' AND relnamespace = 'public'::regnamespace),
  'user_roles RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'commissions' AND relnamespace = 'public'::regnamespace),
  'commissions RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'projects' AND relnamespace = 'public'::regnamespace),
  'projects RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'messages' AND relnamespace = 'public'::regnamespace),
  'messages RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'documents' AND relnamespace = 'public'::regnamespace),
  'documents RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'quotes' AND relnamespace = 'public'::regnamespace),
  'quotes RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'invoices' AND relnamespace = 'public'::regnamespace),
  'invoices RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'payment_events' AND relnamespace = 'public'::regnamespace),
  'payment_events RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'payment_webhook_events' AND relnamespace = 'public'::regnamespace),
  'payment_webhook_events RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'account_deletion_requests' AND relnamespace = 'public'::regnamespace),
  'account_deletion_requests RLS enabled'
);

-- Critical policies present
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'commissions' AND policyname = 'commissions_staff_write'
  ),
  'commissions staff-only write policy exists'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_webhook_events'
      AND policyname = 'payment_webhook_events_staff_select'
  ),
  'payment_webhook_events staff select policy exists'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'partner_applications'
      AND policyname = 'partner_applications_own'
  ),
  'partner_applications own select policy exists'
);

-- Enum sanity
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'commission_status' AND e.enumlabel = 'payout_requested'
  ),
  'commission_status includes payout_requested'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'charged_back'
  ),
  'payment_status includes charged_back'
);

SELECT * FROM finish();
ROLLBACK;
