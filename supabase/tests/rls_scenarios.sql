-- STATUS: NOT APPLIED — local proposal only. Requires explicit owner approval before remote apply.
-- Behavioral RLS scenarios (manual / local). Replace fixture UUIDs when running.

-- Scenario A: customer cannot update commission status
-- Scenario B: partner cannot mark payment as received
-- Scenario C: customer can read own invoice but not another customer's
-- Scenario D: non-participant cannot read conversation messages
-- Scenario E: flagged document versions are not selectable by customers

/*
Example local setup (DO NOT run against remote):

-- as service_role, create two users via auth admin API, then:

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claim.sub', '<customer-uuid>', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

-- Expect 0 rows updated:
UPDATE public.commissions SET status = 'approved' WHERE id = '<commission-uuid>';

-- Expect permission denied / 0 rows for foreign invoice:
SELECT * FROM public.invoices WHERE customer_user_id = '<other-customer-uuid>';
*/

SELECT 'rls_scenarios: placeholder assertions — execute manually on local DB' AS note;
