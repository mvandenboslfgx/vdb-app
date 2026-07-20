# RLS Access Matrix

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


Legend: R=read, C=create, U=update, —=denied, S=staff/admin/owner only

| Table | Customer | Partner | Staff+ |
|---|---|---|---|
| `user_roles` | R own | R own | R/W |
| `partner_applications` | C/R/U own (draft/submitted) | same | R/W |
| `partner_profiles` | R active | R own | R/W |
| `partner_codes` | — | R own | R/W |
| `sales` | R own | R attributed | R/W |
| `commissions` | — | R own | R/W (no partner write) |
| `payout_requests` | — | C/R own | R/W |
| `projects` | R/C member/own | — (unless member) | R/W |
| `messages` | R/C if participant | R/C if participant | R/W |
| `support_tickets` | R/C/U own | R/C/U own | R/W |
| `documents` | R member / own | — | R/W |
| `document_reviews` | C own decision | — | R |
| `quotes` / `invoices` | R own | — | R/W |
| `quote_acceptances` | C own | — | R |
| `payment_events` | R via own invoice | — | R |
| `payment_webhook_events` | — | — | R |
| `appointments` | R/C/U own | — | R/W |
| `reviews` | C/U own draft | — | moderate |
| `push_tokens` / `notifications` | own | own | R |
| `feature_flags` | R | R | R/W |
| `account_deletion_requests` | C/R own | C/R own | R/W |

## Hard rules encoded in RLS

- Partners **cannot** write `commissions` or payment ledgers.
- Customers only see non-internal support messages.
- Document versions with non-clean scans are hidden from non-staff select policy path.
