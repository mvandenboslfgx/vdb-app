-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
-- Sales / commissions layer. Prefer mapping to existing orders when present.
-- Partners never mark payments received; only staff/service_role do.

DO $$ BEGIN
  CREATE TYPE public.sale_status AS ENUM (
    'lead', 'qualified', 'quoted', 'won', 'lost', 'cancelled', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.commission_status AS ENUM (
    'pending',
    'awaiting_payment',
    'payment_received',
    'under_review',
    'approved',
    'payable',
    'payout_requested',
    'paid',
    'rejected',
    'reversed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_request_status AS ENUM (
    'draft', 'submitted', 'under_review', 'approved', 'paid', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid, -- optional FK to existing public.orders when available
  customer_user_id uuid REFERENCES auth.users (id),
  partner_id uuid REFERENCES public.partner_profiles (id),
  status public.sale_status NOT NULL DEFAULT 'lead',
  currency text NOT NULL DEFAULT 'EUR',
  gross_amount_cents integer NOT NULL DEFAULT 0 CHECK (gross_amount_cents >= 0),
  net_amount_cents integer NOT NULL DEFAULT 0 CHECK (net_amount_cents >= 0),
  payment_confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users (id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

-- Soft FK to orders if table exists
DO $$ BEGIN
  IF to_regclass('public.orders') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_id_fkey'
     ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders (id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS sales_partner_id_idx ON public.sales (partner_id);
CREATE INDEX IF NOT EXISTS sales_customer_user_id_idx ON public.sales (customer_user_id);
CREATE INDEX IF NOT EXISTS sales_order_id_idx ON public.sales (order_id);
CREATE INDEX IF NOT EXISTS sales_status_idx ON public.sales (status);

CREATE TABLE IF NOT EXISTS public.sale_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales (id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partner_profiles (id),
  partner_code_id uuid REFERENCES public.partner_codes (id),
  partner_link_id uuid REFERENCES public.partner_links (id),
  attribution_source text NOT NULL DEFAULT 'partner_code',
  attributed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT sale_attributions_sale_partner_unique UNIQUE (sale_id, partner_id)
);

CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales (id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partner_profiles (id),
  status public.commission_status NOT NULL DEFAULT 'pending',
  basis_amount_cents integer NOT NULL CHECK (basis_amount_cents >= 0),
  rate_bps integer CHECK (rate_bps IS NULL OR (rate_bps >= 0 AND rate_bps <= 10000)),
  fixed_amount_cents integer CHECK (fixed_amount_cents IS NULL OR fixed_amount_cents >= 0),
  commission_amount_cents integer NOT NULL DEFAULT 0 CHECK (commission_amount_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  hold_until timestamptz,
  approved_by uuid REFERENCES auth.users (id),
  approved_at timestamptz,
  paid_at timestamptz,
  rejection_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT commissions_amount_source CHECK (
    rate_bps IS NOT NULL OR fixed_amount_cents IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS commissions_partner_id_idx ON public.commissions (partner_id);
CREATE INDEX IF NOT EXISTS commissions_status_idx ON public.commissions (status);
CREATE INDEX IF NOT EXISTS commissions_sale_id_idx ON public.commissions (sale_id);

CREATE TABLE IF NOT EXISTS public.commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.commissions (id) ON DELETE CASCADE,
  from_status public.commission_status,
  to_status public.commission_status NOT NULL,
  actor_id uuid REFERENCES auth.users (id),
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS commission_events_commission_id_idx
  ON public.commission_events (commission_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_profiles (id) ON DELETE CASCADE,
  account_holder_name text NOT NULL,
  iban_encrypted text NOT NULL,
  bic text,
  country text,
  is_default boolean NOT NULL DEFAULT true,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS payout_accounts_partner_id_idx ON public.payout_accounts (partner_id);

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_profiles (id) ON DELETE CASCADE,
  payout_account_id uuid NOT NULL REFERENCES public.payout_accounts (id),
  status public.payout_request_status NOT NULL DEFAULT 'draft',
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'EUR',
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES auth.users (id),
  reviewed_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS payout_requests_partner_id_idx ON public.payout_requests (partner_id);
CREATE INDEX IF NOT EXISTS payout_requests_status_idx ON public.payout_requests (status);

-- Commission status change audit trigger
CREATE OR REPLACE FUNCTION public.trg_commission_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.commission_events (commission_id, from_status, to_status, actor_id, metadata)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), jsonb_build_object('source', 'trigger'));
    PERFORM public.write_audit_log(
      'commission.status_changed',
      'commissions',
      NEW.id,
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS commissions_status_event ON public.commissions;
CREATE TRIGGER commissions_status_event
  AFTER UPDATE OF status ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_commission_status_event();

DROP TRIGGER IF EXISTS sales_set_updated_at ON public.sales;
CREATE TRIGGER sales_set_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS sale_attributions_set_updated_at ON public.sale_attributions;
CREATE TRIGGER sale_attributions_set_updated_at
  BEFORE UPDATE ON public.sale_attributions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS commissions_set_updated_at ON public.commissions;
CREATE TRIGGER commissions_set_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS payout_accounts_set_updated_at ON public.payout_accounts;
CREATE TRIGGER payout_accounts_set_updated_at
  BEFORE UPDATE ON public.payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS payout_requests_set_updated_at ON public.payout_requests;
CREATE TRIGGER payout_requests_set_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

