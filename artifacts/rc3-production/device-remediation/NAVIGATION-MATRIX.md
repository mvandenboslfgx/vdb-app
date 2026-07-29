# Navigation matrix — role-specific shells

| Role              | Primary tabs (max)                                                   | Meer / secondary                                                                                                                  | Must not see                                       |
| ----------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| customer          | Home, Projecten, Berichten, Meer (4)                                 | WhatsApp, language, notifications, support, docs, quotes, invoices, appointments, partner apply, logout; area switches if capable | Admin tabs, partner finance admin, owner-only      |
| partner_pending   | Customer shell (4)                                                   | Customer Meer only                                                                                                                | Partner dashboard, lead create, commissions, admin |
| partner           | Home, Leads, Commissies, Marketing, Meer (5); payouts `href:null`    | WhatsApp, area switches, payout row (disabled without flag)                                                                       | Owner-only, other partners' data, admin mutations  |
| partner_suspended | Same shell; actions fail-closed server-side                          | Support/WhatsApp where allowed                                                                                                    | New lead / referral / sale (Owner enforce)         |
| staff             | Admin 5 tabs                                                         | Admin Meer                                                                                                                        | Owner-only when capability denies                  |
| admin             | Home, Goedkeuringen, Tickets, Financiën, Meer (5); leads `href:null` | Leads + day-1 surfaces (unavailable explained) + WhatsApp + logout                                                                | Sixth primary tab                                  |
| owner             | Same admin shell                                                     | Same + security surface placeholder                                                                                               | Staging refs, live Mollie/payouts                  |

## Admin primary order (final)

1. Home
2. Goedkeuringen
3. Tickets
4. Financiën
5. Meer

## Evidence

- `app/(admin)/_layout.tsx` — leads hidden
- `__tests__/unit/adminTabShell.test.ts`
- Device retest pending after APK rebuild
