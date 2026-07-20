-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
-- Additive product policy for Play Store / Mollie gating.
-- Does not replace existing product columns.

DO $$ BEGIN
  CREATE TYPE public.product_category_policy AS ENUM (
    'service',
    'physical_product',
    'custom_project',
    'digital_good',
    'external_subscription',
    'restricted',
    'manual_review_required'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    ALTER TABLE public.products
      ADD COLUMN IF NOT EXISTS product_category_policy public.product_category_policy
        NOT NULL DEFAULT 'service';
    ALTER TABLE public.products
      ADD COLUMN IF NOT EXISTS checkout_allowed_in_app boolean NOT NULL DEFAULT true;
    ALTER TABLE public.products
      ADD COLUMN IF NOT EXISTS requires_manual_payment_review boolean NOT NULL DEFAULT false;
  ELSE
    -- Local-only stub so migrations are self-contained when remote products is absent.
    CREATE TABLE IF NOT EXISTS public.products (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      product_category_policy public.product_category_policy NOT NULL DEFAULT 'service',
      checkout_allowed_in_app boolean NOT NULL DEFAULT true,
      requires_manual_payment_review boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
      updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_category_policy_idx
  ON public.products (product_category_policy);

