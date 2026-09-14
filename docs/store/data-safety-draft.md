# Data Safety Draft (Play Console)

> Draft only — owner/legal must confirm before submission.

## Collected

| Data type                   | Collected    | Shared                 | Purpose                |
| --------------------------- | ------------ | ---------------------- | ---------------------- |
| Name                        | Yes          | No                     | Account                |
| Email                       | Yes          | No                     | Account / support      |
| Phone                       | Optional     | No                     | Support / appointments |
| User IDs                    | Yes          | No                     | App functionality      |
| Purchase history / invoices | Yes          | No (processor: Mollie) | Billing                |
| Messages                    | Yes          | No                     | Support / projects     |
| Files / docs                | Yes          | No                     | Project delivery       |
| Crash logs                  | Yes (Sentry) | Sentry                 | Stability              |

## Not collected in v1

| Data type                | Why not                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Device IDs / push tokens | The app ships no push client (`expo-notifications` is not a dependency), registers no token, and requests no notification permission. Declare **not collected**. |
| Location                 | No location APIs or permissions in the build.                                                                                                                    |

> Crash logs only leave the device once a Sentry DSN is configured; today the
> DSN is empty and `observability.ts` no-ops. Confirm the Sentry row against the
> shipping configuration before submitting.

## Security

- Data encrypted in transit (TLS)
- Users can request deletion
- Payment card data handled by Mollie Hosted Checkout (not stored by the app)
