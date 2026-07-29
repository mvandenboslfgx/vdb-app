# Edge Functions (stubs)

> **STATUS: NOT DEPLOYED / NOT APPLIED to remote.**

Local stubs only. Implement and deploy after owner approval.

| Function                   | Purpose                            |
| -------------------------- | ---------------------------------- |
| `create-checkout`          | Mollie Hosted Checkout session     |
| `mollie-webhook`           | Idempotent payment confirmation    |
| `payment-policy-gate`      | Play Store / category policy check |
| `send-notification`        | Push + delivery logging            |
| `approve-commission`       | Staff commission release           |
| `book-appointment`         | Transactional slot booking         |
| `request-account-deletion` | Deletion request intake            |

Never put Mollie or service-role secrets in the mobile app.
