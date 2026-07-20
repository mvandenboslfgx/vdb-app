# Data Safety Draft (Play Console)

> Draft only — owner/legal must confirm before submission.

## Collected

| Data type | Collected | Shared | Purpose |
|---|---|---|---|
| Name | Yes | No | Account |
| Email | Yes | No | Account / support |
| Phone | Optional | No | Support / appointments |
| User IDs | Yes | No | App functionality |
| Purchase history / invoices | Yes | No (processor: Mollie) | Billing |
| Messages | Yes | No | Support / projects |
| Files / docs | Yes | No | Project delivery |
| Crash logs | Yes (Sentry) | Sentry | Stability |
| Device IDs / push tokens | Yes | Push provider | Notifications |

## Security

- Data encrypted in transit (TLS)
- Users can request deletion
- Payment card data handled by Mollie Hosted Checkout (not stored by the app)
