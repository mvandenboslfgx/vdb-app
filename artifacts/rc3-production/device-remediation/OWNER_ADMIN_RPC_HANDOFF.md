# Owner Admin RPC handoff — Mobile device remediation

**From:** VDB Digital Mobile (`vdb-app`)
**To:** VDB Digital 2.0 Owner / canonical backend
**Date:** 2026-07-29
**Mobile HEAD:** `41f3378c60c1fa80f7c0a6202551d1731708134a` (+ local remediation WIP)
**Contract:** `vdb-backend-contract@0.2.0-rc.3`
**Policy:** Mobile will **not** ship service-role, mocks, legacy tables, or client aggregation as auth. Fail-closed until Owner surfaces land.

---

## Contract drift (fix first)

| Mobile `OWNER_RPCS`                       | `contracts/backend-contract.json` `required` |
| ----------------------------------------- | -------------------------------------------- |
| `transition_portal_support_ticket_status` | `transition_portal_support_ticket`           |

Align canonical name; Mobile mapper must match Owner.

---

## P0 — blocks Admin Home / Approvals

### 1. `admin_dashboard_stats`

| Field              | Spec                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Goal**           | Aggregate day-1 admin Home counters                                                                                                                                                        |
| **Input**          | none (auth via JWT)                                                                                                                                                                        |
| **Output (jsonb)** | `{ open_partner_applications, open_tickets, commissions_under_review, payout_requests, unread_messages?, documents_pending_review?, upcoming_appointments? }` using Owner column semantics |
| **Source tables**  | `partner_applications`, `portal_support_tickets`, `partner_commissions`, `partner_payout_requests`, (+ messaging/docs/appointments if in scope)                                            |
| **Capability**     | `staff` / `admin` / `owner` via `is_staff_or_above` (or Owner equivalent)                                                                                                                  |
| **AAL2**           | Read OK at AAL1; optional step-up not required for counts                                                                                                                                  |
| **RLS**            | SECURITY DEFINER; never expose cross-tenant via anon                                                                                                                                       |
| **Audit**          | Optional read audit                                                                                                                                                                        |
| **Errors**         | `42501` / app code `forbidden` for non-staff                                                                                                                                               |
| **Contract**       | Add to `rpcNames.required` + Mobile `RC3_OWNER_RPCS` / `OWNER_RPCS`                                                                                                                        |
| **Mobile**         | Replace hard throw in `getAdminStats()` with `rpcOwner(..., 'admin_dashboard_stats')` + mapper to `AdminDashboardStats`                                                                    |
| **Tests**          | staff success; customer deny; empty zeros; mapper                                                                                                                                          |

**Mobile today:** `CONTRACT_SURFACE_UNAVAILABLE:admin_dashboard_stats`
**Local proposal SQL:** exists but targets **legacy** table names — **not** production-ready.

### 2. `admin_work_queue`

| Field                 | Spec                                                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**              | Combined approvals / support / finance queue for Home + Approvals                                                                                                             |
| **Input**             | optional `p_limit int`                                                                                                                                                        |
| **Output**            | jsonb array of `{ id, type, title, subtitle, created_at, priority, ... }` with `type` in `partner_application \| support_ticket \| commission_review \| document_review \| …` |
| **Source**            | `partner_applications`, `portal_support_tickets`, `partner_commissions`, …                                                                                                    |
| **Capability**        | staff+                                                                                                                                                                        |
| **AAL2**              | Read AAL1                                                                                                                                                                     |
| **Contract + Mobile** | Allowlist + `listAdminQueue()` via `rpcOwner`                                                                                                                                 |
| **Tests**             | ordering; empty; type filter for Approvals                                                                                                                                    |

**Mobile today:** `CONTRACT_SURFACE_UNAVAILABLE:admin_work_queue`

---

## P0/P1 — finance mutations (day-1 required; payout process excluded)

### 3. `approve_partner_commission` (name TBD — canonical Owner)

|              |                                                                                     |
| ------------ | ----------------------------------------------------------------------------------- |
| Goal         | Approve commission under review                                                     |
| Input        | `p_commission_id uuid`, `p_reason text` (required)                                  |
| Output       | `{ id, status: 'approved' }`                                                        |
| Tables       | `partner_commissions`, audit                                                        |
| Capability   | staff+; **block partner self-approval**                                             |
| AAL2         | **Required**                                                                        |
| Audit        | yes                                                                                 |
| Idempotency  | yes                                                                                 |
| Feature flag | fail-closed                                                                         |
| Mobile today | `CONTRACT_SURFACE_UNAVAILABLE:approve_commission` — UI shows “Nog niet beschikbaar” |

### 4. `reject_partner_commission`

Same pattern; status `rejected`; reason required; AAL2; Mobile stub + unavailable UI.

### 5. Payout processing

**Owner decision:** remains **disabled** until separate authorization.
Do **not** enable `process_payout_request` / `record_partner_payout_paid` for Mobile day-1 execution UI.
`approve_partner_payout_request` may exist in contract for later — Mobile must not expose process-paid CTA.

### 6. `reject_partner_payout_request` (if day-1 reject without paying)

| Mobile today | `CONTRACT_SURFACE_UNAVAILABLE:reject_payout_request` |

---

## P1 — partner lifecycle

### 7. `suspend_partner` / `reactivate_partner`

|              |                                                |
| ------------ | ---------------------------------------------- |
| Input        | `p_partner_id`, `p_reason`                     |
| Capability   | admin/owner (staff policy TBD by Owner)        |
| AAL2         | **Required**                                   |
| Audit        | yes                                            |
| Mobile today | `CONTRACT_SURFACE_UNAVAILABLE:suspend_partner` |
| UI           | Partners Meer → unavailable until RPC          |

`review_partner_application` already in contract — Mobile approvals actions wired via `approve_partner_application` / `reject_partner_application` mappings.

---

## P1 — admin directory surfaces (Meer)

Propose list/detail RPCs or documented staff SELECT policies on:

| Surface      | Proposed RPC or policy                        | Owner tables                        |
| ------------ | --------------------------------------------- | ----------------------------------- |
| Producten    | `admin_list_products` / catalog Owner objects | Owner catalog (confirm name)        |
| Partners     | `admin_list_partners`                         | `partner_profiles`, `partner_codes` |
| Klanten      | `admin_list_customers`                        | `profiles` / orgs                   |
| Projecten    | staff read `portal_projects`                  | `portal_projects`                   |
| Offertes     | staff read `portal_quotes`                    | `portal_quotes`                     |
| Facturen     | staff read `portal_invoices`                  | `portal_invoices`                   |
| Afspraken    | staff read `portal_appointments`              | `portal_appointments`               |
| Instellingen | Owner config read                             | TBD                                 |
| Beveiliging  | security/AAL status                           | TBD                                 |

Mobile Meer rows navigate to explicit **“Nog niet beschikbaar”** placeholders until these land.

---

## Already in rc.3 — Mobile wiring status

| Surface                    | Contract                                         | Mobile status                                    |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Partner application review | `review_partner_application`                     | Wired (`approve`/`reject` partner application)   |
| Lead review / convert      | `review_partner_lead`, `confirm_partner_sale`    | Wired for admin leads                            |
| Support ticket reply       | `reply_portal_support_ticket`                    | Wired (`admin_reply_support_ticket`)             |
| Assign ticket              | `assign_portal_support_ticket`                   | Wired                                            |
| Transition ticket          | see drift above                                  | Wired to Mobile mapping — **confirm Owner name** |
| Ticket list                | table `portal_support_tickets`                   | Wired via `listTickets` / RLS                    |
| Finance list               | `partner_commissions`, `partner_payout_requests` | Wired read                                       |
| Leads list                 | `partner_leads`                                  | Wired read                                       |

---

## AAL2 / audit expectations (all sensitive mutations)

- Server checks capability + AAL2/step-up claim where Owner policy requires.
- Reject with clear error code Mobile can map (no silent success).
- Write audit row (actor, action, target, reason, request id).
- Idempotency key where double-submit is harmful.

---

## Mobile integration checklist (after Owner ships)

1. Land migrations in **Owner** repo only.
2. Bump `contracts/backend-contract.json` + shared schemaVersion.
3. Mobile: update `OWNER_RPCS` / `RC3_OWNER_RPCS` / mappers.
4. Replace throws / unavailable UI with live calls.
5. Staging matrix + S25 manual.
6. One production-equivalent APK — **no store submit**.

---

## Explicit non-goals for this handoff

- Mobile applying production SQL
- Service-role in the app
- Using local migration `admin_dashboard_stats` against production
- Enabling payout paid-marking in UI

---

## Mobile WIP status (2026-07-29 remediation) — supersedes stale “hard-throw” notes for tickets/finance UI

Updated after Mobile device-remediation pass. Owner still owns missing RPCs.

| Surface                                 | Subagent snapshot (stale if unchecked) | Current Mobile WIP                                                                                                                                               |
| --------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tickets list                            | Hard-throw `support_tickets`           | **Wired** → `listTickets()` / `portal_support_tickets`                                                                                                           |
| Ticket reply / assign / status          | Hard-throw stubs                       | **Wired** via `rpcOwner` (`admin_reply_support_ticket`, `admin_assign_ticket`, `admin_update_ticket_status`) — **confirm transition RPC name drift before prod** |
| Ticket detail UI                        | —                                      | Reply + status actions present; **`assignTicket` not exposed in UI yet**                                                                                         |
| Internal notes                          | —                                      | Detail may still filter `is_internal=false` on listMessages — staff internal path needs Owner/flag alignment                                                     |
| Finance commission approve/reject       | Interactive buttons → throw            | **Non-interactive** “Nog niet beschikbaar” until Owner RPC                                                                                                       |
| Payout process                          | Interactive button → throw             | **Non-interactive** `payoutProcessingDisabled` (Owner policy)                                                                                                    |
| Dashboard / work queue / approvals list | Hard-throw                             | **Still fail-closed** — P0 Owner                                                                                                                                 |
| Suspend / reactivate / directory Meer   | Missing                                | Placeholders / throws remain — Owner                                                                                                                             |
| AAL2                                    | None in Mobile                         | **Still none** — Owner must enforce step-up server-side; Mobile security surface is placeholder                                                                  |
| Products catalog                        | Outside `portal_*`/`partner_*`         | Confirm Owner catalog object name before Mobile binding                                                                                                          |

Canonical Owner action list remains §§1–2 (dashboard/queue) + commission review + suspend/reactivate + directory/security RPCs.
