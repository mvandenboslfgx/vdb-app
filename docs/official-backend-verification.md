# Official backend verification

**Date:** 2026-07-20  
**Mode:** read-only MCP inspection only — **no remote mutations**  
**Candidate project:** `vdb nieuw` (`nhsrdnjfsxfikfbdmdfj`, `eu-west-1`, Postgres 17)

## Verification verdict

| Question | Finding |
|---|---|
| Is this *likely* the VDB Digital Software website backend? | **Yes, strongly indicated** — product catalog, quote_requests, Mollie-shaped `payments` + idempotent `webhook_events`, `admin_roles`, shared `profiles` ↔ `auth.users` |
| Is ownership / “official production” contractually proven in-repo? | **Not fully** — no signed owner attestation file; agent must treat remote apply as **BLOCKED** until Matthijs confirms |
| Safe to apply mobile migrations remotely now? | **No** |
| Safe for local/staging work? | **Yes** — use local Supabase; map to this schema contract |

**Activation status:** `BLOCKED BY OWNER CONFIRMATION` for remote apply; local integration proceeds on local Supabase.

## Existing public tables (confirmed)

`profiles`, `admin_roles`, `categories`, `products`, `product_features`, `product_faqs`, `carts`, `cart_items`, `customers`, `orders`, `order_items`, `payments`, `leads`, `quote_requests`, `contact_submissions`, `case_studies`, `audit_logs`, `webhook_events`, `site_settings`, `consent_records`

## Auth model

- Supabase Auth (`profiles.id` → `auth.users`)
- Elevated access via `admin_roles` enum: `OWNER`, `ADMIN`, `SUPPORT`, `CONTENT`
- Client cannot write `admin_roles` (RLS deny)
- Website commerce tables largely **deny authenticated client** (service-role / edge intended)

## Storage buckets

`storage.buckets` query returned **no rows** at audit time. Mobile private document buckets are **not present remotely** and must be created via additive migrations (local first).

## Shared vs mobile-only

| Shared now | Mobile additive (local proposal) |
|---|---|
| Auth identity, profiles, admin_roles | user_roles, projects, messaging, documents |
| products, orders, payments, webhook_events | quotes/invoices portal tables, commissions |
| leads, quote_requests | partner_profiles/codes, appointments, push_tokens |

## Implications

1. One central account (website + app) is feasible via this Auth project **if** owner confirms it is official.
2. Until confirmation + staging apply, the app must run against **local Supabase** or explicit demo mode.
3. No production Edge deploy / migration apply in this phase.
