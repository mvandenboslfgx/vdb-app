# Payments (Mollie)

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


## Absolute rules

1. Customers pay **VDB Digital Software** only (never partners).
2. Mollie API keys are **server-only**.
3. Client never marks a payment as paid.
4. Authoritative confirmation = Mollie API re-fetch inside `mollie-webhook`.

## Status model

`created` → `open`/`pending` → `authorized`? → `paid`  
Failure paths: `failed`, `expired`, `canceled`  
Post-paid: `refunded`, `partially_refunded`, `charged_back`

## Checkout sequence

1. App calls `create-checkout` with invoice/order id
2. `payment-policy-gate` evaluates `product_category_policy` + feature flags
3. Edge function creates Mollie Hosted Checkout
4. App opens checkout URL (system browser / WebBrowser)
5. Return via verified deep link
6. App re-fetches status from backend (not Mollie client-side)
7. Webhook finalizes ledger + may advance commissions to `payment_received`

## Play Store policy gate

Blocked by default for in-app Mollie checkout:

- `digital_good`
- `external_subscription`
- `restricted`
- `manual_review_required`

Require explicit feature flags (`payments.digital_goods_checkout`, etc.) plus legal review before enabling.

## Idempotency

`payment_webhook_events` unique on `(provider, provider_event_id)`.
Duplicate webhooks must no-op safely.
