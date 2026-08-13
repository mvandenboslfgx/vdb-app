-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
-- Additive hardening for the existing notification proposal. No remote apply in this commit.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_idempotency_key_unique
  ON public.notifications (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.notification_deliveries
  ADD COLUMN IF NOT EXISTS provider_receipt_id text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS notification_deliveries_status_idx
  ON public.notification_deliveries (status, created_at);

COMMENT ON COLUMN public.notifications.idempotency_key IS
  'Server-generated event idempotency key; prevents duplicate notification fan-out.';
COMMENT ON COLUMN public.notification_deliveries.provider_receipt_id IS
  'Provider receipt/ticket identifier used for asynchronous delivery reconciliation.';
