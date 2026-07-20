# VDB Digital Mobile — Implementation Reality Audit

**Branch:** `feature/vdb-mobile-app-v1`  
**Audited:** 2026-07-20  
**Verdict:** This branch is a **UI + demo shell** with proposed schema/migrations and stub edge functions. Almost nothing is production-real against the remote Supabase project. Default runtime without `EXPO_PUBLIC_SUPABASE_*` is DEMO mode (`clientEnv.useMockData === true`).

### Cross-cutting blockers (apply to nearly every “real” path)

| Blocker | Evidence |
|---|---|
| Remote migrations **NOT APPLIED** | `supabase/migrations/README.md`, `docs/known-limitations.md` |
| Edge functions are stubs (mostly **501**) | `supabase/functions/*/index.ts`, `supabase/functions/README.md` |
| Repositories prefer `mockStore` when `shouldUseMockApi()` | `src/api/repositories/_utils.ts`, every `*Repository.ts` |
| No camelCase ↔ snake_case mappers on Supabase reads | e.g. `as Project` casts in repositories vs `Project` camelCase in `src/types/domain.ts` |
| RPCs called by app **do not exist** in migration SQL | `approve_partner_application`, `admin_dashboard_stats`, `admin_work_queue`, `request_commission_payout` only referenced from TS |
| Maestro flows are **placeholders** (`optional: true`) | `maestro/*.yaml` |
| Unit tests cover helpers only (roles, flags, format, linking, paymentPolicy) | `__tests__/unit/*` — **zero** repository/API/E2E coverage |

---

## Summary table

| Feature | Status |
|---|---|
| authentication | REAL BUT NOT END-TO-END TESTED |
| profile | PARTIAL |
| role routing | REAL BUT NOT END-TO-END TESTED |
| projects | DEMO ONLY |
| milestones | DEMO ONLY |
| chat | PARTIAL |
| support | PARTIAL |
| documents | PARTIAL |
| document versions | MISSING |
| document reviews | PARTIAL |
| quotes | PARTIAL |
| quote acceptance | PARTIAL |
| invoices | PARTIAL |
| checkout | STUB |
| payment webhooks | STUB |
| appointments | PARTIAL |
| partner applications | PARTIAL |
| partner codes | DEMO ONLY |
| leads | PARTIAL |
| sales | MISSING |
| commissions | PARTIAL |
| payouts | BLOCKED BY OWNER CONFIGURATION |
| reviews | DEMO ONLY |
| push notifications | STUB |
| mobile admin | DEMO ONLY |
| account deletion | STUB |

### Counts

| Status | Count |
|---|---|
| REAL AND TESTED | **0** |
| REAL BUT NOT END-TO-END TESTED | **2** |
| PARTIAL | **12** |
| DEMO ONLY | **5** |
| STUB | **4** |
| MISSING | **2** |
| BLOCKED BY OWNER CONFIGURATION | **1** |
| **Total** | **26** |

---

## Feature detail

### authentication

1. **Status:** REAL BUT NOT END-TO-END TESTED  
2. **Evidence paths:**  
   - `src/providers/AuthProvider.tsx`  
   - `src/features/auth/components/LoginForm.tsx`  
   - `src/features/auth/components/RegisterForm.tsx`  
   - `app/(auth)/login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx`  
   - `src/security/roles.ts` (`isPubliclyAssignableRole`)  
   - `maestro/01_customer_register.yaml`, `maestro/02_customer_login.yaml` (placeholders)  
3. **What works today:** With Supabase env set: `signInWithPassword`, `signUp`, `signOut`, password reset, resend verification against Supabase Auth. Public register sanitizes roles (never assigns admin client-side). Without env: DEMO login accepts any credentials / `enterDemoAs`.  
4. **What is fake/demo/stub:** Full DEMO auth when `!hasSupabaseConfig`; demo profiles hardcoded; Maestro asserts are optional placeholders.  
5. **Gap to REAL:** Wire E2E against a real project; confirm email templates / deep links; load profile from `profiles` (not only `user_metadata`); apply `user_roles` migration so roles are authoritative.

---

### profile

1. **Status:** PARTIAL  
2. **Evidence paths:**  
   - `src/providers/AuthProvider.tsx` (`mapProfileFromUser`)  
   - `app/(customer)/more/index.tsx` (displays name; language / links)  
   - `src/api/repositories/accountRepository.ts` (`getProfile` → always `mockProfile`)  
3. **What works today:** Auth-derived display name / email / phone metadata in real mode; More screen shows limited identity + language toggle.  
4. **What is fake/demo/stub:** `accountRepository.getProfile()` always returns mock; no edit-profile / avatar upload; no `profiles` table read/update.  
5. **Gap to REAL:** CRUD against `profiles`, editable settings UI, avatar storage, sync locale to backend.

---

### role routing

1. **Status:** REAL BUT NOT END-TO-END TESTED  
2. **Evidence paths:**  
   - `src/security/roles.ts` (`resolveHomeRoute`, `canAccessAdminArea`, …)  
   - `app/index.tsx`  
   - `app/(customer)/_layout.tsx`, `app/(partner)/_layout.tsx`, `app/(admin)/_layout.tsx`  
   - `__tests__/unit/roles.test.ts`  
   - `src/providers/AuthProvider.tsx` (`fetchRoles` → `user_roles`)  
3. **What works today:** Client redirects by role; partner/admin layouts guard access; unit tests cover resolve helpers. Demo role switch via `enterDemoAs`.  
4. **What is fake/demo/stub:** Demo roles are local state only. Real `user_roles` table is in **unapplied** migrations. Sensitive actions are not re-checked server-side on mobile (client trust).  
5. **Gap to REAL:** Apply migrations; seed roles; E2E role switch; ensure every mutation enforces RLS/RPC server-side.

---

### projects

1. **Status:** DEMO ONLY  
2. **Evidence paths:**  
   - `app/(customer)/projects/index.tsx`, `[id].tsx`, `request.tsx`  
   - `src/api/repositories/projectsRepository.ts`  
   - `src/api/mockData.ts` (`mockStore.projects`)  
   - `supabase/migrations/20260720100500_projects.sql`  
   - `maestro/03_customer_project_request.yaml`, `04_customer_open_project.yaml`  
3. **What works today:** Browse mock projects; request form updates **in-memory** `mockStore` only.  
4. **What is fake/demo/stub:** `requestProject` **always** `mockStore.projects.unshift(...)` even when `!shouldUseMockApi()`. `getCustomerDashboard` still spreads `buildCustomerDashboard` mock. List/get “real” path casts snake_case rows as camelCase types (would break UI). Schema not on remote.  
5. **Gap to REAL:** Real insert into `projects` with customer_id from auth; mappers; applied migrations + RLS; drop mock fallback for production builds.

---

### milestones

1. **Status:** DEMO ONLY  
2. **Evidence paths:**  
   - `app/(customer)/projects/[id].tsx`  
   - `src/api/repositories/projectsRepository.ts` (`listMilestones`, `listUpdates`)  
   - `src/api/mockData.ts`  
   - `supabase/migrations/20260720100500_projects.sql`  
3. **What works today:** Read-only milestone/update lists from mock data on project detail.  
4. **What is fake/demo/stub:** No create/complete mutations; default path is mock; “real” select untested and schema not applied.  
5. **Gap to REAL:** Applied schema, mappers, staff write paths (or RPC), and customer read E2E.

---

### chat

1. **Status:** PARTIAL  
2. **Evidence paths:**  
   - `app/(customer)/messages/index.tsx`, `[id].tsx`  
   - `src/api/repositories/messagesRepository.ts`  
   - `src/features/messages/api/messagesRepository.ts` (parallel mock-only feature repo)  
   - `supabase/migrations/20260720100600_messaging.sql`  
   - `maestro/05_customer_send_message.yaml`  
3. **What works today:** Thread UI; send appends to mockStore in DEMO; non-mock path inserts into `messages`.  
4. **What is fake/demo/stub:** DEMO is default; no realtime subscription despite `realtimeChat` flag; response shape not mapped; duplicate feature mock repository; `messagesRepository.send` hardcodes demo sender id. Schema not applied.  
5. **Gap to REAL:** Apply messaging migration; realtime; presence/delivery; camelCase mapping; remove mock for production; E2E send/receive.

---

### support

1. **Status:** PARTIAL  
2. **Evidence paths:**  
   - `app/(customer)/support/index.tsx`, `new.tsx`, `[id].tsx`  
   - `src/api/repositories/supportRepository.ts`  
   - `supabase/migrations/20260720100700_support.sql`  
   - `maestro/17_customer_support_ticket.yaml`  
3. **What works today:** Create/list tickets against mockStore; non-mock path inserts `support_tickets`.  
4. **What is fake/demo/stub:** Default mock; no reply thread / staff response UI for customers; admin tickets always mock (see mobile admin). Schema not applied.  
5. **Gap to REAL:** Applied schema, ticket messages, notifications, staff workflow, E2E.

---

### documents

1. **Status:** PARTIAL  
2. **Evidence paths:**  
   - `app/(customer)/documents/index.tsx`, `[id].tsx`  
   - `src/api/repositories/documentsRepository.ts`  
   - `src/features/documents/api/documentsRepository.ts` (mock-only twin)  
   - `supabase/migrations/20260720100800_documents.sql`  
   - `maestro/06_customer_upload_document.yaml`, `07_customer_approve_document.yaml`  
3. **What works today:** List + status review decisions mutate mockStore or update `documents.status` in non-mock path.  
4. **What is fake/demo/stub:** **No upload UI** (Maestro “upload” is a placeholder); no storage integration; feature-layer repo is mock-only; scan status is display-only from mock.  
5. **Gap to REAL:** Storage upload, virus-scan pipeline, applied schema, remove mocks, E2E approve/reject.

---

### document versions

1. **Status:** MISSING  
2. **Evidence paths:**  
   - Schema only: `supabase/migrations/20260720100800_documents.sql` (`document_versions`)  
   - UI only shows `doc.currentVersion` number from document row (`app/(customer)/documents/[id].tsx`)  
3. **What works today:** Nothing as a product feature — no version list, upload, or download of a specific version.  
4. **What is fake/demo/stub:** Mock documents include a `currentVersion` field for display.  
5. **Gap to REAL:** Version repository, storage objects per version, history UI, RLS on `document_versions`.

---

### document reviews

1. **Status:** PARTIAL  
2. **Evidence paths:**  
   - `app/(customer)/documents/[id].tsx`  
   - `src/api/repositories/documentsRepository.ts` (`submitReviewDecision`)  
   - `supabase/migrations/20260720100800_documents.sql` (`document_reviews`, trigger)  
   - `docs/document-approval-flow.md`  
3. **What works today:** Approve / request-changes buttons flip status in mock or update document row.  
4. **What is fake/demo/stub:** Does not insert proper `document_reviews` rows from the client; no reject decision wired in UI (repo supports it); DEMO default.  
5. **Gap to REAL:** Write through review table/trigger path; terms/audit; E2E; applied migrations.

---

### quotes

1. **Status:** PARTIAL  
2. **Evidence paths:**  
   - `app/(customer)/quotes/index.tsx`, `[id].tsx`  
   - `src/api/repositories/quotesRepository.ts`  
   - `src/features/quotes/api/quotesRepository.ts` (mock twin)  
   - `supabase/migrations/20260720100900_quotes_and_terms.sql`  
3. **What works today:** List/detail from mock; non-mock select from `quotes`.  
4. **What is fake/demo/stub:** Mock items/totals; real path casting likely broken; schema not applied; no staff quote creation on mobile.  
5. **Gap to REAL:** Applied schema, mappers, nested line items, PDF/link, E2E.

---

### quote acceptance

1. **Status:** PARTIAL  
2. **Evidence paths:**  
   - `app/(customer)/quotes/[id].tsx`  
   - `src/api/repositories/quotesRepository.ts` (`acceptQuote` / `rejectQuote`)  
   - `supabase/migrations/20260720100900_quotes_and_terms.sql` (`terms_acceptances`)  
   - `maestro/08_customer_accept_quote.yaml`  
3. **What works today:** Accept/reject flips quote status in mockStore or updates `quotes.status`.  
4. **What is fake/demo/stub:** No terms checkbox → `terms_acceptances` write; no signature; DEMO default; Maestro placeholder.  
5. **Gap to REAL:** Legal acceptance ledger, server validation, invoice/project side-effects, E2E.

---

### invoices

1. **Status:** PARTIAL  
2. **Evidence paths:**  
   - `app/(customer)/invoices/index.tsx`, `[id].tsx`  
   - `src/api/repositories/invoicesRepository.ts`  
   - `supabase/migrations/20260720101000_invoices_and_payments.sql`  
3. **What works today:** List/detail from mock or select `invoices`. Pay button delegates to checkout (see below).  
4. **What is fake/demo/stub:** Read-only; amounts from mock; no PDF; schema not applied.  
5. **Gap to REAL:** Applied invoices ledger aligned with existing remote `orders`/`payments` (see integration map), mappers, E2E.

---

### checkout

1. **Status:** STUB  
2. **Evidence paths:**  
   - `src/api/repositories/paymentsRepository.ts` (`createCheckout`)  
   - `app/(customer)/invoices/[id].tsx`  
   - `supabase/functions/create-checkout/index.ts` (**501**)  
   - `supabase/functions/payment-policy-gate/index.ts` (local evaluate stub)  
   - `src/security/featureFlags.ts` (`mollieCheckout` **default false**)  
   - `src/security/paymentPolicy.ts`  
   - `maestro/09_customer_open_checkout.yaml`  
3. **What works today:** Client policy gate fail-closed; DEMO returns fake `https://www.mollie.com/checkout/demo/...` URL and **does not** mark invoice paid (correctly).  
4. **What is fake/demo/stub:** Edge `create-checkout` returns 501. Client invokes **`create-mollie-checkout`** (name mismatch with folder `create-checkout`). Amount still resolved from `mockStore.invoices` even on “real” path. Feature flag off by default.  
5. **Gap to REAL:** Implement + deploy Mollie checkout; fix function name; load invoice from DB; owner enables flags after Play policy review; E2E with webhook.

---

### payment webhooks

1. **Status:** STUB  
2. **Evidence paths:**  
   - `supabase/functions/mollie-webhook/index.ts` (**501**)  
   - `supabase/migrations/20260720101000_invoices_and_payments.sql`  
   - `docs/payments.md`  
   - `maestro/14_payment_confirmed.yaml` (placeholder)  
3. **What works today:** Nothing — stub response only.  
4. **What is fake/demo/stub:** Entire handler is TODO / 501; Maestro is a screenshot placeholder.  
5. **Gap to REAL:** Idempotent Mollie re-fetch, ledger writes, invoice status, commission advancement, deploy + secrets.

---

### appointments

1. **Status:** PARTIAL  
2. **Evidence paths:**  
   - `app/(customer)/appointments/index.tsx` (list only)  
   - `src/api/repositories/appointmentsRepository.ts`  
   - `supabase/functions/book-appointment/index.ts` (**501**)  
   - `supabase/migrations/20260720101100_appointments_and_reviews.sql`  
3. **What works today:** List mock appointments; non-mock select/insert exists in repository.  
4. **What is fake/demo/stub:** **No booking UI** calling `requestAppointment` or the edge function; transactional booking edge is 501; DEMO default.  
5. **Gap to REAL:** Slot picker UI, `book-appointment` implementation with locking, applied schema, notifications, E2E.

---

### partner applications

1. **Status:** PARTIAL  
2. **Evidence paths:**  
   - `app/(customer)/more/partner-apply.tsx`  
   - `src/api/repositories/partnersRepository.ts` (`submitPartnerApplication`)  
   - `supabase/migrations/20260720100300_partner_domain.sql`  
   - `maestro/10_partner_apply.yaml`, `11_admin_approve_partner.yaml`  
3. **What works today:** Form submits to mock (returns fake id) or inserts `partner_applications` when not mocking.  
4. **What is fake/demo/stub:** DEMO default; admin approve RPC missing from SQL (see mobile admin); schema not applied.  
5. **Gap to REAL:** Applied schema, approval RPC + role grant, email, E2E apply→approve.

---

### partner codes

1. **Status:** DEMO ONLY  
2. **Evidence paths:**  
   - `app/(partner)/marketing/index.tsx` (shows `linkUrl` only)  
   - `src/api/repositories/partnersRepository.ts` (`getPartnerLink`)  
   - `src/api/mockData.ts` / `src/features/_shared/mockData.ts` (`code: 'VDB-DEMO'`)  
   - `supabase/migrations/20260720100300_partner_domain.sql` (`partner_codes`)  
3. **What works today:** Copy a mock partner referral link string.  
4. **What is fake/demo/stub:** No `partner_codes` list/create/rotate; no attribution; mock code/link only.  
5. **Gap to REAL:** Codes CRUD, deep-link attribution to leads/sales, applied schema, E2E.

---

### leads

1. **Status:** PARTIAL  
2. **Evidence paths:**  
   - `app/(partner)/leads/index.tsx`, `new.tsx`  
   - `src/api/repositories/partnersRepository.ts` (`listLeads`, `createLead`)  
   - `supabase/migrations/20260720100300_partner_domain.sql`  
   - `maestro/12_partner_register_lead.yaml`  
3. **What works today:** Create/list leads in mockStore; non-mock insert into `leads`.  
4. **What is fake/demo/stub:** DEMO default; consent is a checkbox only (no `consent_records`); partner_id not set explicitly on insert.  
5. **Gap to REAL:** Applied schema, consent ledger, attribution to codes, E2E.

---

### sales

1. **Status:** MISSING  
2. **Evidence paths:**  
   - Schema only: `supabase/migrations/20260720100400_sales_commissions.sql` (`sales`, `sale_attributions`)  
   - Docs: `docs/backend-integration-map.md`, `docs/partner-commission-rules.md`  
   - Maestro `13_admin_confirm_sale.yaml` (placeholder only)  
3. **What works today:** No mobile repository, screen, or mutation for sales.  
4. **What is fake/demo/stub:** N/A — not implemented in app.  
5. **Gap to REAL:** Admin/partner sales confirmation UI + RPCs, wire to commissions, apply migrations.

---

### commissions

1. **Status:** PARTIAL  
2. **Evidence paths:**  
   - `app/(partner)/commissions/index.tsx`  
   - `src/api/repositories/commissionsRepository.ts`  
   - `src/api/mockData.ts`  
   - `supabase/migrations/20260720100400_sales_commissions.sql`  
   - `supabase/functions/approve-commission/index.ts` (**501**)  
   - `maestro/15_commission_approved.yaml`  
3. **What works today:** Partner can browse mock commissions; non-mock select exists.  
4. **What is fake/demo/stub:** Status progression depends on payment/sales that don’t exist; approve-commission edge is 501; DEMO default.  
5. **Gap to REAL:** Real sales→commission pipeline, staff approval edge, applied schema, E2E.

---

### payouts

1. **Status:** BLOCKED BY OWNER CONFIGURATION  
2. **Evidence paths:**  
   - `app/(partner)/payouts/index.tsx`  
   - `src/api/repositories/commissionsRepository.ts` (`requestPayout`)  
   - `src/security/featureFlags.ts` (`partnerPayouts` **default false**)  
   - `maestro/16_partner_request_payout.yaml`  
3. **What works today:** UI shows disabled messaging when flag off; mock path can flip payable→`payout_requested` only if flag enabled.  
4. **What is fake/demo/stub:** Non-mock path calls missing RPC `request_commission_payout`; payout screen often shows “disabled” even after mutate; DEMO mutations only.  
5. **Gap to REAL:** Owner enables flag after compliance review; implement RPC + payout ledger; bank details; E2E; never mark paid client-side.

---

### reviews

1. **Status:** DEMO ONLY  
2. **Evidence paths:**  
   - `app/(customer)/reviews/new.tsx`  
   - `src/api/repositories/accountRepository.ts` (`submitReview` → in-memory array)  
   - `src/features/reviews/api/reviewsRepository.ts` (mock list only)  
   - `supabase/migrations/20260720101100_appointments_and_reviews.sql`  
3. **What works today:** Form submits into a process-local array; hardcodes `projectId: 'proj-1'`.  
4. **What is fake/demo/stub:** Entire persistence is fake; never writes `reviews` table.  
5. **Gap to REAL:** Insert with project binding, moderation, publish consent, applied schema, E2E.

---

### push notifications

1. **Status:** STUB  
2. **Evidence paths:**  
   - `src/features/notifications/api/notificationsRepository.ts` (always mock list)  
   - `src/features/notifications/hooks/useNotifications.ts`  
   - `src/security/featureFlags.ts` (`pushNotifications` **default false**)  
   - `supabase/functions/send-notification/index.ts` (**501**)  
   - `supabase/migrations/20260720101200_notifications_flags_deletion.sql`  
   - `docs/push-notifications.md`  
3. **What works today:** In-app mock notification list only (if wired).  
4. **What is fake/demo/stub:** No Expo push token registration in production path; edge stub; flag off.  
5. **Gap to REAL:** Token register/refresh, deploy sender, event triggers, flag enablement, device E2E on Samsung S25 plan.

---

### mobile admin

1. **Status:** DEMO ONLY  
2. **Evidence paths:**  
   - `app/(admin)/*`  
   - `src/api/repositories/adminRepository.ts`  
   - `src/security/featureFlags.ts` (`mobileAdmin`)  
   - `maestro/11_admin_approve_partner.yaml`, `13_admin_confirm_sale.yaml`, `15_commission_approved.yaml`  
3. **What works today:** Demo admin can browse mock queue and approve/reject by mutating `mockStore.adminQueue`.  
4. **What is fake/demo/stub:** `listAdminTickets` / `listFinanceItems` **always** return `mockStore` even when Supabase is configured. “Real” RPCs (`admin_dashboard_stats`, `admin_work_queue`, `approve_partner_application`) are **not defined** in migrations. Docs state web admin remains primary.  
5. **Gap to REAL:** Implement RPCs, real ticket/finance queries, sales confirmation, audit logs, or explicitly ship as read-only and keep web as source of truth.

---

### account deletion

1. **Status:** STUB  
2. **Evidence paths:**  
   - `app/(customer)/more/account-deletion.tsx`  
   - `src/api/repositories/accountRepository.ts` (`requestDeletion` fake id)  
   - `src/features/partner/hooks/usePartnerData.ts` (`useAccountDeletion`)  
   - `supabase/functions/request-account-deletion/index.ts` (**501**)  
   - `docs/account-deletion.md`  
   - `maestro/18_account_deletion_request.yaml`  
3. **What works today:** Confirm-word UI then `setTimeout(400)` + local `signOut` — **no server write**.  
4. **What is fake/demo/stub:** Screen does not call edge function or repository; edge returns 501; repository returns synthetic id.  
5. **Gap to REAL:** Authenticated edge insert into `account_deletion_requests`, confirmation email, staff purge workflow, Play Store public deletion URL, E2E.

---

## Test reality

| Layer | Reality |
|---|---|
| Unit (`__tests__/unit`) | Pure helpers only — **not** feature correctness |
| Maestro (`maestro/`) | All flows marked “Placeholder”; most taps `optional: true` |
| REAL AND TESTED features | **None** |

---

## Honest bottom line

Ship this branch as a **demoable UX prototype**, not as a backend-integrated mobile product. To move any domain feature to REAL:

1. Owner applies (or explicitly rejects) `supabase/migrations/`  
2. Implement and deploy edge functions (stop returning 501)  
3. Replace mockStore defaults; add snake_case mappers  
4. Implement missing RPCs the client already calls  
5. Replace Maestro placeholders with real testIDs + CI against a seeded project  

Until then, treat DEMO / STUB / PARTIAL classifications above as the source of truth over optimistic docs.
