# Database Model (Mobile Proposal)

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

## Conventions

- UUID primary keys (`gen_random_uuid()`)
- `created_at` / `updated_at` (UTC)
- Soft deletes (`deleted_at`) where retention requires
- Check constraints for money (≥ 0) and status enums
- RLS enabled on all new user-facing tables

## Status enums

### Commission (`commission_status`)

`pending` → `awaiting_payment` → `payment_received` → `under_review` → `approved` → `payable` → `payout_requested` → `paid`  
Also: `rejected`, `reversed`

### Payment (`payment_status`)

`created`, `open`, `pending`, `authorized`, `paid`, `failed`, `expired`, `canceled`, `refunded`, `partially_refunded`, `charged_back`

### Project (`project_status`)

`request_received`, `intake`, `quote`, `accepted`, `planning`, `in_progress`, `waiting_on_customer`, `review`, `revision`, `completed`, `paused`, `cancelled`

### Document (`document_status`)

`draft`, `uploaded`, `processing`, `available`, `under_review`, `approved`, `changes_requested`, `superseded`, `archived`, `rejected`

### Partner application

`draft`, `submitted`, `under_review`, `approved`, `rejected`, `suspended`

## Entity groups

1. **Roles** — `user_roles`
2. **Partners** — applications, profiles, codes, links
3. **Sales** — sales, attributions, commissions, events, payout accounts/requests
4. **Projects** — projects, members, updates, milestones, activity
5. **Messaging** — conversations, participants, messages, receipts
6. **Support** — tickets, ticket messages
7. **Documents** — documents, versions, reviews
8. **Commercial docs** — quotes, quote items/acceptances, terms, invoices
9. **Payments ledger** — payment_events, payment_webhook_events
10. **Scheduling / social** — availability_slots, appointments, reviews
11. **Platform** — push_tokens, notifications, deliveries, feature_flags, account_deletion_requests

ER sketches live in migration SQL (FKs). Prefer reading `supabase/migrations/*.sql`.
