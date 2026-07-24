-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_id text,
  app_version text,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT push_tokens_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens (user_id);

DO $$ BEGIN
  CREATE TYPE public.notification_channel AS ENUM ('push', 'email', 'in_app');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_delivery_status AS ENUM (
    'queued', 'sent', 'delivered', 'failed', 'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  category text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  deep_link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON public.notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications (id) ON DELETE CASCADE,
  channel public.notification_channel NOT NULL,
  push_token_id uuid REFERENCES public.push_tokens (id) ON DELETE SET NULL,
  status public.notification_delivery_status NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error_message text,
  attempted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS notification_deliveries_notification_id_idx
  ON public.notification_deliveries (notification_id);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT feature_flags_key_unique UNIQUE (key)
);

INSERT INTO public.feature_flags (key, description, enabled)
VALUES
  -- Canonical contract keys (see contracts/backend-contract.json)
  ('mollie_checkout', 'FAIL-CLOSED — Mollie hosted checkout', false),
  ('digital_product_checkout', 'FAIL-CLOSED — digital goods / Play gate', false),
  ('partner_payouts', 'FAIL-CLOSED — partner payout requests', false),
  ('push_notifications', 'Remote push delivery (needs provider)', false),
  ('documents_virus_scan', 'Virus scan provider configured', false),
  ('partner.applications', 'Allow new partner applications', true),
  ('chat.attachments', 'Allow chat attachments', true),
  ('appointments.booking', 'Allow appointment booking', true)
ON CONFLICT (key) DO NOTHING;

DO $$ BEGIN
  CREATE TYPE public.account_deletion_status AS ENUM (
    'requested', 'verified', 'processing', 'completed', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status public.account_deletion_status NOT NULL DEFAULT 'requested',
  reason text,
  requested_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  verified_at timestamptz,
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users (id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_user_id_idx
  ON public.account_deletion_requests (user_id);
CREATE INDEX IF NOT EXISTS account_deletion_requests_status_idx
  ON public.account_deletion_requests (status);

DROP TRIGGER IF EXISTS push_tokens_set_updated_at ON public.push_tokens;
CREATE TRIGGER push_tokens_set_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS notifications_set_updated_at ON public.notifications;
CREATE TRIGGER notifications_set_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS notification_deliveries_set_updated_at ON public.notification_deliveries;
CREATE TRIGGER notification_deliveries_set_updated_at
  BEFORE UPDATE ON public.notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS feature_flags_set_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_set_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS account_deletion_requests_set_updated_at ON public.account_deletion_requests;
CREATE TRIGGER account_deletion_requests_set_updated_at
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

