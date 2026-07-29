# RC3 Mobile device remediation — root-cause analysis

**Status:** READ-ONLY investigation complete. No product code changed.
**Verdict (interim):** `RC3 MOBILE PRODUCTION BUILD AND INTERNAL VALIDATION BLOCKED`
**Date:** 2026-07-29
**Device evidence:** owner Samsung S25 screenshot + live device `SM-S931B` / Android 16

---

## Environment snapshot

| Field                             | Value                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| Repo                              | `C:\Users\XXX\vdb-app`                                                                          |
| Branch                            | `fix/a5-owner-contract-runtime`                                                                 |
| HEAD                              | `41f3378c60c1fa80f7c0a6202551d1731708134a`                                                      |
| Working tree                      | Clean tracked tree; untracked `artifacts/` + `scripts/rc3-production-role-isolation-matrix.mjs` |
| Package                           | `nl.vdbdigital.app`                                                                             |
| versionName / versionCode         | `1.0.0` / `2`                                                                                   |
| Installed on                      | Samsung S25 `SM-S931B`, Android 16, serial `R3GYC00EBYY`                                        |
| AAB build-ID                      | `97e62b92-6c58-4fe7-93ca-57672428a475`                                                          |
| APK build-ID                      | `1ae574dc-46ab-40f6-aceb-d78fc21a5da2`                                                          |
| Signing cert                      | `58:DA:3D:…:B5:9E` (matches install)                                                            |
| Current UI at investigation start | Public shell (logged out): Inloggen / Account aanmaken                                          |
| Owner screenshot                  | `owner-s25-defect-screenshot.png`                                                               |
| Prior automation                  | Preview/production matrix marked admin home as PASS while sampling the exact error string       |

---

## Defect 1 — Adminomgeving laadt niet

### Observed

- UI: `Admingegevens konden niet worden geladen.` + `Opnieuw proberen`
- i18n: `src/i18n/locales/nl/admin.json` → `error`
- Screen: `app/(admin)/index.tsx` → `ErrorState` when `getAdminDashboardBundle()` throws or `stats` is null
- Retry calls the same loader (no alternate path)

### Code path

1. `AdminHomeScreen.load` → `getAdminDashboardBundle()`
2. `getAdminStats()` + `listAdminQueue()` in parallel (`src/api/repositories/adminRepository.ts`)
3. In live/production (non-mock):

```ts
throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:admin_dashboard_stats');
throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:admin_work_queue');
```

### Why (root cause)

**Intentional Mobile hard-fail**, not a transient network/RLS miss:

- Comments claim SECURITY DEFINER RPCs `admin_dashboard_stats` / `admin_work_queue` are the source of truth.
- Live path **never calls** those RPCs; it throws configuration errors.
- RPCs are **absent** from `RC3_OWNER_RPCS` / `OWNER_RPCS` / `contracts/backend-contract.json`.
- Local Mobile proposal migration defines those functions, but against **legacy** table names (`support_tickets`, `commissions`, `documents`, …), not Owner-canonical `portal_*` / `partner_*`.
- Generated types include the RPC names, but the runtime contract allowlist does not.

### Cascade

Same unavailable queue RPC feeds Approvals (`listApprovals` → `listAdminQueue`).
Tickets list throws `CONTRACT_SURFACE_UNAVAILABLE:support_tickets` even though `portal_support_tickets` is an allowed rc.3 table (incomplete Mobile wiring).
Finance/leads table reads appear wired to Owner tables and may work independently.

### Classification

| Layer                 | Finding                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Mobile                | Hard throw; swallows DomainError into generic UI error; retry useless                        |
| Contract              | `admin_dashboard_stats` / `admin_work_queue` not in rc.3 shared RPC allowlist                |
| Owner/backend         | Canonical Owner RPCs on portal/partner schema not confirmed as Mobile contract surfaces      |
| Automation false PASS | Matrix expected only “no generic config crash” while detail contained the admin error string |

### Owner boundary

Proper fix requires Owner-authorized canonical RPCs (or explicit Owner permission for interim Mobile reads from already-allowed tables).
**No service-role / mock / client bypass** will be added.

---

## Defect 2 — Zesde tab `leads` + truncated labels

### Observed

- Tabs: Home, Goedke…, Tickets, Financiën, Meer, **leads** (lowercase, placeholder icon)
- Crowding / truncation on S25 width

### Root cause

Expo Router file-based Tabs auto-registers sibling routes.

- Declared tabs in `app/(admin)/_layout.tsx`: index, approvals, tickets, finance, more (5)
- Undeclared sibling: `app/(admin)/leads/` (`_layout.tsx`, `index.tsx`, `[id].tsx`)
- No `href: null` / `Tabs.Screen` hide → becomes a **6th primary tab** with default route-name title `leads` and default/missing icon
- Product intent already places Leads under Meer: `app/(admin)/more/index.tsx` → `router.push('/(admin)/leads')`
- Preferred structure in remediation brief matches existing 5-tab shell + Leads under Meer
- Truncation of `Goedkeuringen` is a consequence of 6 crowded items + label style (`premiumTabBar.ts` small font); expected to improve once sixth tab is removed (still verify on S25)

### Classification

**Mobile UI/routing bug** — fixable without Owner. Not a product-order ambiguity.

---

## Defect 3 — WhatsApp ontbreekt / niet betrouwbaar

### Observed (owner report)

WhatsApp-koppeling missing in Instellingen.

### Code facts

- Helper: `src/lib/whatsapp.ts` → `buildWhatsAppUrl` uses `EXPO_PUBLIC_WHATSAPP_NUMBER`
- Customer Meer shows WhatsApp row always (`app/(customer)/more/index.tsx`)
- If number empty → `buildWhatsAppUrl` returns `null` → `openWhatsApp` **silently no-ops** (visible, non-clickable effect)
- Admin Meer has **no** WhatsApp row
- `.env.example` empty; `eas.json` production/preview env blocks do **not** set `EXPO_PUBLIC_WHATSAPP_NUMBER`
- No approved number or default message in docs/contracts

### Classification

**Config + UX gap.** Implementing a number without Owner input is forbidden.
Also: silent no-op is a clickability FAIL even when the row is shown.

---

## Defect 4 — Clickability / non-functional surfaces

Confirmed from code (device full audit pending re-login):

| Element                                 | Issue                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------- |
| Admin Home retry                        | Retries same hard throw                                                     |
| Approvals load                          | Depends on unavailable `admin_work_queue`                                   |
| Admin Tickets load                      | Hard throw `support_tickets`                                                |
| Customer WhatsApp row                   | Visible; null URL → no feedback                                             |
| Auto `leads` tab                        | Present without proper icon/options; may navigate into stack inconsistently |
| Admin commission/payout/suspend helpers | Multiple `CONTRACT_SURFACE_UNAVAILABLE:*` stubs                             |

---

## Automation gap (why 48 PASS lied)

Preview `matrix-results.json` admin flow:

- `expected`: `no generic config crash`
- `result`: `PASS`
- `detail`: contains `Admingegevens konden niet worden geladen.`

Automation equated “did not crash” with “works”. Device visual/functional acceptance must remain mandatory.

---

## Safe next steps (after Owner answers)

### Mobile-only (unblocked)

1. Hide `leads` from primary Tabs (`href: null`); keep Meer entry
2. Fail tests if admin primary tab count > 5 or route title `leads` appears as tab
3. WhatsApp: hide row unless configured; show error when open fails — **after** number/message from Owner
4. Harden matrix assertions: admin error string = FAIL
5. Wire admin ticket list to allowed `portal_support_tickets` if Owner confirms day-1 requirement

### Owner-blocked

1. Canonical `admin_dashboard_stats` + `admin_work_queue` (Owner schema) + contract allowlist + Mobile `rpcOwner` wiring
   **or** explicit interim authorization for table composition from rc.3 tables
2. Confirm production EAS secret `EXPO_PUBLIC_WHATSAPP_NUMBER` (or decide against WhatsApp for day 1)
3. Remaining admin mutation stubs (`suspend_partner`, commission approve/reject, etc.) if required day 1

---

## Play Store

**Not authorized. No submit. No new AAB until S25 retest green after fixes.**
