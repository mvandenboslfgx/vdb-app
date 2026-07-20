-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
-- Existing payments + webhook_events remain. These tables are mobile Mollie event ledgers
-- that can optionally reference payments.id.

DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM (
    'draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void', 'credited'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'created',
    'open',
    'pending',
    'authorized',
    'paid',
    'failed',
    'expired',
    'canceled',
    'refunded',
    'partially_refunded',
    'charged_back'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  customer_user_id uuid NOT NULL REFERENCES auth.users (id),
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.quotes (id) ON DELETE SET NULL,
  order_id uuid,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'EUR',
  subtotal_cents integer NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  tax_cents integer NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents integer NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  amount_paid_cents integer NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  issued_on date,
  due_on date,
  pdf_storage_path text,
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number)
);

DO $$ BEGIN
  IF to_regclass('public.orders') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_order_id_fkey') THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders (id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS invoices_customer_user_id_idx ON public.invoices (customer_user_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices (status);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount_cents integer NOT NULL CHECK (unit_amount_cents >= 0),
  tax_rate_bps integer NOT NULL DEFAULT 2100 CHECK (tax_rate_bps >= 0 AND tax_rate_bps <= 10000),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx ON public.invoice_items (invoice_id);

-- Payment events: authoritative status transitions (server/webhook only)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid, -- optional map to existing public.payments
  invoice_id uuid REFERENCES public.invoices (id) ON DELETE SET NULL,
  order_id uuid,
  mollie_payment_id text,
  status public.payment_status NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  source text NOT NULL DEFAULT 'mollie',
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DO $$ BEGIN
  IF to_regclass('public.payments') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_events_payment_id_fkey') THEN
    ALTER TABLE public.payment_events
      ADD CONSTRAINT payment_events_payment_id_fkey
      FOREIGN KEY (payment_id) REFERENCES public.payments (id) ON DELETE SET NULL;
  END IF;
  IF to_regclass('public.orders') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_events_order_id_fkey') THEN
    ALTER TABLE public.payment_events
      ADD CONSTRAINT payment_events_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders (id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS payment_events_payment_id_idx ON public.payment_events (payment_id);
CREATE INDEX IF NOT EXISTS payment_events_invoice_id_idx ON public.payment_events (invoice_id);
CREATE INDEX IF NOT EXISTS payment_events_mollie_payment_id_idx ON public.payment_events (mollie_payment_id);

-- Mollie-specific webhook ledger (idempotent). Distinct from generic webhook_events.
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mollie',
  provider_event_id text,
  mollie_payment_id text,
  payload jsonb NOT NULL,
  signature_valid boolean,
  processing_status text NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processed', 'ignored', 'failed')),
  error_message text,
  related_webhook_event_id uuid, -- optional map to existing webhook_events
  received_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT payment_webhook_events_provider_event_unique
    UNIQUE (provider, provider_event_id)
);

DO $$ BEGIN
  IF to_regclass('public.webhook_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'payment_webhook_events_related_webhook_event_id_fkey'
     ) THEN
    ALTER TABLE public.payment_webhook_events
      ADD CONSTRAINT payment_webhook_events_related_webhook_event_id_fkey
      FOREIGN KEY (related_webhook_event_id) REFERENCES public.webhook_events (id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS payment_webhook_events_mollie_payment_id_idx
  ON public.payment_webhook_events (mollie_payment_id);

DROP TRIGGER IF EXISTS invoices_set_updated_at ON public.invoices;
CREATE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS invoice_items_set_updated_at ON public.invoice_items;
CREATE TRIGGER invoice_items_set_updated_at
  BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

