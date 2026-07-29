# Backend Schema Audit

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

## Remote project

| Field      | Value                                   |
| ---------- | --------------------------------------- |
| Name       | vdb nieuw                               |
| Ref        | `nhsrdnjfsxfikfbdmdfj`                  |
| Audit mode | Read-only inventory for mobile planning |

## Tables already present (reuse)

All listed tables have **RLS enabled** on remote.

| Domain          | Tables                                                                  |
| --------------- | ----------------------------------------------------------------------- |
| Identity        | `profiles`, `admin_roles`                                               |
| Catalog         | `categories`, `products`, `product_features`, `product_faqs`            |
| Commerce        | `carts`, `cart_items`, `customers`, `orders`, `order_items`, `payments` |
| Leads / content | `leads`, `quote_requests`, `contact_submissions`, `case_studies`        |
| Ops / privacy   | `audit_logs`, `webhook_events`, `site_settings`, `consent_records`      |

## Gaps for mobile portal (proposed locally)

See `supabase/migrations/`. Key additions:

- `user_roles`, partner domain, sales/commissions/payouts
- projects, messaging, support, documents
- formal `quotes` (+ items/acceptances) alongside existing `quote_requests`
- `invoices`, `payment_events`, `payment_webhook_events`
- appointments, reviews, push/notifications, feature flags, account deletion

## Additive product change

`products.product_category_policy` enum:

`service | physical_product | custom_project | digital_good | external_subscription | restricted | manual_review_required`

## Warnings

- Do **not** duplicate `orders`/`payments` as a second source of truth; map `sales` and payment events onto them.
- Do **not** replace `admin_roles`; `user_roles` is additive for the mobile role set.
- Column-level shapes of remote tables were not mutated; FK attaches are best-effort `IF` blocks.
