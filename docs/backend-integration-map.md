# Backend Integration Map

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


| Mobile concept | Existing remote | Proposed / mapping |
|---|---|---|
| User profile | `profiles` | Local additive `app_profiles` + remote `profiles` reuse later |
| Staff/admin gate | `admin_roles` | `is_staff_or_above()` OR `user_roles` |
| Catalog / checkout eligibility | `products` | Add `product_category_policy` |
| Cart checkout | `carts`, `cart_items`, `orders` | Reuse orders as commercial backbone |
| Partner sale | — | `sales` + optional `sales.order_id → orders.id` |
| Attribution | `leads` (partial) | `sale_attributions`, `partner_codes`, `partner_links` |
| Commission | — | `commissions`, `commission_events` |
| Lead quote form | `quote_requests` | Keep; formal offer = `quotes` |
| Payment record | `payments` | Reuse; append `payment_events` |
| Generic webhooks | `webhook_events` | Keep; Mollie ledger = `payment_webhook_events` |
| Audit | `audit_logs` | Reuse via `write_audit_log()` |
| Consent | `consent_records` | Reuse + `terms_acceptances` |
| Contact | `contact_submissions` | Support tickets are separate domain |
| Mobile projects / chat / docs | — | Local tables + RLS suite (`npm run test:rls`) |

## App adapter wiring (Phase 3)

| Layer | Path |
|---|---|
| Adapter selection | `src/api/repositories/_utils.ts` (`demo` \| `supabase`) |
| Typed client | `src/lib/supabase.ts` + `src/types/database.generated.ts` |
| Domain errors | `src/lib/errors.ts` |
| Row mappers | `src/lib/mappers.ts` |
| Repositories | `src/api/repositories/*` |

## Edge Functions → tables

| Function | Reads/writes |
|---|---|
| `create-checkout` | invoices/orders/products → Mollie → `payment_events` |
| `mollie-webhook` | `payment_webhook_events`, `payment_events`, invoices/orders, commissions |
| `payment-policy-gate` | products + `feature_flags` |
| `approve-commission` | `commissions`, `commission_events`, `audit_logs` |
| `book-appointment` | `availability_slots`, `appointments` |
| `send-notification` | `notifications`, `push_tokens`, `notification_deliveries` |
| `request-account-deletion` | `account_deletion_requests` |
