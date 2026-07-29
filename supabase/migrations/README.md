# Supabase Migrations — VDB Digital Mobile

> **STATUS: NOT APPLIED**
>
> All SQL files in this directory are **local proposals only**.
> They must **not** be applied to the remote Supabase project
> (`nhsrdnjfsxfikfbdmdfj` / "vdb nieuw") without **explicit owner approval**.

## Purpose

These migrations add mobile-portal tables and policies that do not yet exist
on the audited remote schema. Existing remote tables are **reused**, not duplicated.

| Existing (remote)                   | Mobile approach                                                   |
| ----------------------------------- | ----------------------------------------------------------------- |
| `profiles`, `admin_roles`           | Extend with `user_roles`; map staff/admin carefully               |
| `products`, `categories`, …         | Add `product_category_policy` column only                         |
| `orders`, `order_items`, `payments` | Keep as source of truth; `sales` / `payment_events` map onto them |
| `quote_requests`                    | Keep for lead intake; formal `quotes` are separate                |
| `webhook_events`                    | Keep; `payment_webhook_events` is Mollie-specific ledger          |
| `audit_logs`, `consent_records`     | Reuse for audit / privacy events                                  |

## How to use locally

```bash
npx supabase start
npx supabase db reset
```

## Remote apply (owner only)

See `docs/production-migration-runbook.md`. Never run `supabase db push`
against production without written owner approval and a backup.

## Migration inventory

| File                                              | Scope                                             |
| ------------------------------------------------- | ------------------------------------------------- |
| `20260720100000_helpers_and_extensions.sql`       | Extensions, triggers, role helpers                |
| `20260720100100_user_roles.sql`                   | Mobile role assignments                           |
| `20260720100200_products_category_policy.sql`     | Product policy enum/column                        |
| `20260720100300_partner_domain.sql`               | Partner applications, profiles, codes, links      |
| `20260720100400_sales_commissions.sql`            | Sales, attributions, commissions, payouts         |
| `20260720100500_projects.sql`                     | Projects and related entities                     |
| `20260720100600_messaging.sql`                    | Conversations and messages                        |
| `20260720100700_support.sql`                      | Support tickets                                   |
| `20260720100800_documents.sql`                    | Documents, versions, reviews                      |
| `20260720100900_quotes_and_terms.sql`             | Quotes and terms acceptances                      |
| `20260720101000_invoices_and_payments.sql`        | Invoices + payment event ledgers                  |
| `20260720101100_appointments_and_reviews.sql`     | Appointments, slots, reviews                      |
| `20260720101200_notifications_flags_deletion.sql` | Push, flags, account deletion                     |
| `20260720101300_rls_policies.sql`                 | Row Level Security policies                       |
| `20260720101400_app_profiles_and_guards.sql`      | app_profiles, signup trigger, project/role guards |
