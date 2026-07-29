# Observability Runbook

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

## Signals

| Signal                   | Tool                                       |
| ------------------------ | ------------------------------------------ |
| Mobile crashes           | Sentry React Native                        |
| API errors               | Sentry + Supabase logs                     |
| Payment webhook failures | `payment_webhook_events.processing_status` |
| Notification failures    | `notification_deliveries`                  |
| Auth anomalies           | Supabase Auth logs                         |

## Alerting (recommended)

- Webhook `failed` rate > threshold
- Checkout 5xx from `create-checkout`
- Commission approval without `payment_received` (should be impossible — treat as Sev1)

## Triage

1. Identify environment (`EXPO_PUBLIC_APP_ENV`)
2. Correlate `payment_events.mollie_payment_id`
3. Re-fetch Mollie payment (server)
4. Do **not** manually mark paid from client tooling without owner approval
