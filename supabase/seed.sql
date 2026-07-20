-- STATUS: NOT APPLIED to remote — local seed for integration tests
-- Seed deterministic users/projects after `supabase db reset` (local only)

-- Note: auth.users seeding typically uses supabase auth admin / test helpers.
-- This file documents expected seed entities for Maestro + pgTAP.

-- feature flags fail-closed financials
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('mollie_checkout', false, 'FAIL-CLOSED'),
  ('digital_product_checkout', false, 'FAIL-CLOSED'),
  ('partner_payouts', false, 'FAIL-CLOSED'),
  ('push_notifications', false, 'needs credentials')
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;
