-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
-- Formal quotes vs existing quote_requests (lead intake). Keep both; map in app layer.

DO $$ BEGIN
  CREATE TYPE public.quote_status AS ENUM (
    'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL,
  customer_user_id uuid NOT NULL REFERENCES auth.users (id),
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  quote_request_id uuid, -- optional map to existing quote_requests
  status public.quote_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'EUR',
  subtotal_cents integer NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  tax_cents integer NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents integer NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  valid_until date,
  terms_version_id uuid,
  notes text,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT quotes_quote_number_unique UNIQUE (quote_number)
);

DO $$ BEGIN
  IF to_regclass('public.quote_requests') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_quote_request_id_fkey') THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_quote_request_id_fkey
      FOREIGN KEY (quote_request_id) REFERENCES public.quote_requests (id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS quotes_customer_user_id_idx ON public.quotes (customer_user_id);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON public.quotes (status);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes (id) ON DELETE CASCADE,
  product_id uuid,
  description text NOT NULL,
  quantity numeric(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount_cents integer NOT NULL CHECK (unit_amount_cents >= 0),
  tax_rate_bps integer NOT NULL DEFAULT 2100 CHECK (tax_rate_bps >= 0 AND tax_rate_bps <= 10000),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DO $$ BEGIN
  IF to_regclass('public.products') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quote_items_product_id_fkey') THEN
    ALTER TABLE public.quote_items
      ADD CONSTRAINT quote_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS quote_items_quote_id_idx ON public.quote_items (quote_id);

CREATE TABLE IF NOT EXISTS public.quote_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes (id) ON DELETE CASCADE,
  accepted_by uuid NOT NULL REFERENCES auth.users (id),
  accepted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ip_address inet,
  user_agent text,
  signature_name text NOT NULL,
  terms_version_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT quote_acceptances_quote_unique UNIQUE (quote_id)
);

CREATE TABLE IF NOT EXISTS public.terms_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  version text NOT NULL,
  locale text NOT NULL DEFAULT 'nl',
  title text NOT NULL,
  body_markdown text NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT timezone('utc', now()),
  effective_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT terms_versions_code_version_locale_unique UNIQUE (code, version, locale)
);

CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terms_version_id uuid NOT NULL REFERENCES public.terms_versions (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ip_address inet,
  user_agent text,
  context text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT terms_acceptances_unique UNIQUE (terms_version_id, user_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_terms_version_id_fkey') THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_terms_version_id_fkey
      FOREIGN KEY (terms_version_id) REFERENCES public.terms_versions (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quote_acceptances_terms_version_id_fkey') THEN
    ALTER TABLE public.quote_acceptances
      ADD CONSTRAINT quote_acceptances_terms_version_id_fkey
      FOREIGN KEY (terms_version_id) REFERENCES public.terms_versions (id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DROP TRIGGER IF EXISTS quotes_set_updated_at ON public.quotes;
CREATE TRIGGER quotes_set_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS quote_items_set_updated_at ON public.quote_items;
CREATE TRIGGER quote_items_set_updated_at
  BEFORE UPDATE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS terms_versions_set_updated_at ON public.terms_versions;
CREATE TRIGGER terms_versions_set_updated_at
  BEFORE UPDATE ON public.terms_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

