-- STATUS: NOT APPLIED — local proposal only.
-- Canonicalize feature_flags keys to contract snake_case (2026.07.24 remediation).
-- Aliases from payments.* / partner.* are migrated then left disabled for compatibility.

INSERT INTO public.feature_flags (key, enabled, description)
VALUES
  ('mollie_checkout', false, 'FAIL-CLOSED — Mollie hosted checkout'),
  ('digital_product_checkout', false, 'FAIL-CLOSED — digital goods / Play gate'),
  ('partner_payouts', false, 'FAIL-CLOSED — partner payout requests'),
  ('push_notifications', false, 'Remote push delivery (needs provider)'),
  ('documents_virus_scan', false, 'Virus scan provider configured')
ON CONFLICT (key) DO UPDATE
SET
  description = EXCLUDED.description,
  updated_at = timezone('utc', now());

-- Copy prior enabled state from legacy keys (should remain false in local seeds).
UPDATE public.feature_flags AS target
SET enabled = source.enabled,
    updated_at = timezone('utc', now())
FROM public.feature_flags AS source
WHERE target.key = 'mollie_checkout'
  AND source.key = 'payments.mollie_checkout';

UPDATE public.feature_flags AS target
SET enabled = source.enabled,
    updated_at = timezone('utc', now())
FROM public.feature_flags AS source
WHERE target.key = 'digital_product_checkout'
  AND source.key = 'payments.digital_goods_checkout';

UPDATE public.feature_flags AS target
SET enabled = source.enabled,
    updated_at = timezone('utc', now())
FROM public.feature_flags AS source
WHERE target.key = 'partner_payouts'
  AND source.key = 'partner.payouts';

-- Force fail-closed on financial canonical keys after migration.
UPDATE public.feature_flags
SET enabled = false,
    updated_at = timezone('utc', now())
WHERE key IN ('mollie_checkout', 'digital_product_checkout', 'partner_payouts');

CREATE OR REPLACE FUNCTION public.feature_flag_enabled(p_keys text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean;
BEGIN
  IF to_regclass('public.feature_flags') IS NULL THEN
    RETURN false;
  END IF;
  SELECT COALESCE(bool_or(enabled), false)
    INTO v_enabled
  FROM public.feature_flags
  WHERE key = ANY (p_keys);
  RETURN COALESCE(v_enabled, false);
END;
$$;

REVOKE ALL ON FUNCTION public.feature_flag_enabled(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feature_flag_enabled(text[]) TO authenticated, service_role;
