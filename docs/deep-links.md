# Deep Links & App Links

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

## Schemes

| Type            | Example                         |
| --------------- | ------------------------------- |
| Custom scheme   | `vdbdigital://...`              |
| HTTPS App Links | `https://vdbdigital.nl/app/...` |

Configured in `app.config.ts` (`scheme: vdbdigital`) and Android intent filters via Expo.

## Suggested routes

| Path                      | Screen                      |
| ------------------------- | --------------------------- |
| `/app/login`              | Auth                        |
| `/app/projects/:id`       | Project detail              |
| `/app/quotes/:id`         | Quote                       |
| `/app/invoices/:id`       | Invoice                     |
| `/app/payments/return`    | Post-checkout return        |
| `/app/partner/link/:slug` | Partner attribution landing |
| `/app/support/:id`        | Ticket                      |

## Payment return

Return URL must be validated server-side; deep link alone is **not** payment proof.
