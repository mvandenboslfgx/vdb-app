# Edge Functions

| Function                   | Purpose                                            | Status                                                |
| -------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `create-checkout`          | Mollie Hosted Checkout (staging test-mode invoice) | Implemented in-repo; deploy only with staging secrets |
| `mollie-webhook`           | Prefer Owner `/api/webhooks/mollie`                | Stub — Owner webhook is canonical                     |
| `payment-policy-gate`      | Play Store / category policy check                 | Stub                                                  |
| `send-notification`        | Push + delivery logging                            | Stub                                                  |
| `approve-commission`       | Staff commission release                           | Stub                                                  |
| `book-appointment`         | Transactional slot booking                         | Stub                                                  |
| `request-account-deletion` | Deletion request intake                            | Stub                                                  |

## create-checkout requirements (staging only)

- `APP_ENV=staging`
- `MOLLIE_TEST_CHECKOUT_ENABLED=true`
- `CHECKOUT_ENABLED` unset/false
- `MOLLIE_API_KEY` test_-shaped
- Supabase ref `qzekuvmgfekzsowdecyk`
- `MOLLIE_WEBHOOK_TOKEN` + Owner webhook base URL
- Never put Mollie or service-role secrets in the mobile app
