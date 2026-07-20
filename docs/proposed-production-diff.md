# Proposed production diff (NOT APPLIED)

This document summarizes additive changes proposed for the official backend after owner approval. **Nothing here has been applied remotely.**

## Source

Local files under `supabase/migrations/` (each header: `STATUS: NOT APPLIED`).

## High-level diff

1. **Enums:** `app_role`, commission/project/document/support/partner/lead/product_policy statuses  
2. **Tables:** `user_roles`, partner domain, projects/messaging/support, documents/versions/reviews, quotes/terms, invoices extensions, appointments, reviews, push/notifications, feature_flags, account_deletion_requests, marketing_assets, sales/commissions/payouts  
3. **Columns:** e.g. `products.product_policy_type`, `leads.partner_id`  
4. **RLS:** membership helpers, isolation policies, fail-closed financial writes  
5. **Storage:** private buckets for documents (remote currently has **zero** buckets)  
6. **Edge Functions:** create-checkout, mollie-webhook, notifications, commission/payout/appointment/deletion/policy-gate  

## Risk notes

- Must be additive and preserve website cart/order/payment flows  
- Map carefully to existing `admin_roles` vs new `user_roles`  
- Expand payment statuses carefully if website enums are narrower than mobile model  
- Staging apply + RLS test suite required before production  

## Owner gate

See `docs/production-migration-runbook.md` and `docs/manual-owner-actions.md`. Remote apply remains **forbidden** in Phase 2.
