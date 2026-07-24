-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
-- Seed feature flags only. Local auth identities + sample domain data:
--   node scripts/seed-local-identities.mjs
-- (see docs/local-test-identities.md)

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('mollie_checkout', false, 'FAIL-CLOSED'),
  ('digital_product_checkout', false, 'FAIL-CLOSED'),
  ('partner_payouts', false, 'FAIL-CLOSED'),
  ('push_notifications', false, 'needs credentials'),
  ('documents_virus_scan', false, 'needs provider')
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;
