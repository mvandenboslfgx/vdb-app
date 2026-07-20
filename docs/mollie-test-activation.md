# Mollie test activation

## Rules

- Mobile app never holds Mollie API keys
- Development/staging: `test_` keys only
- Production live keys require separate explicit owner approval (not this phase)
- Missing key → HTTP **503** `FEATURE_NOT_CONFIGURED` (not 501)

## Owner steps (test)

1. Create Mollie test profile
2. Add `MOLLIE_API_KEY=test_...` to local Edge secrets / staging secrets
3. Set webhook URL to staging `mollie-webhook` function
4. Enable feature flag `mollie_checkout` only after policy review
5. Keep `digital_product_checkout` fail-closed on Android until Play Billing review

## Automated tests without key

Use `createFakePaymentProvider` + `applyMollieWebhook` unit tests in `__tests__/unit/paymentsWebhook.test.ts`.

## Status this phase

`BLOCKED BY OWNER CONFIGURATION` for real Hosted Checkout against Mollie.
Domain reducer + fake provider: implemented and unit-tested.
