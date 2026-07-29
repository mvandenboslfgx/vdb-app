# RC4 Mobile integration — status

**Date:** 2026-07-29
**Mobile HEAD (start):** `41f3378c60c1fa80f7c0a6202551d1731708134a`
**Owner commit:** `8e4d5f76c8ec609ca1f7bdf2f5553a07b773e591`
**Contract pin:** `vdb-backend-contract@0.2.0-rc.4`
**schemaVersion:** `2026.07.29.admin-control-surface-rc4`

## Verdict

```text
RC4 MOBILE INTEGRATION BLOCKED
```

Reason: local unit/typecheck gates progressed, but **staging matrix against `qzekuvmgfekzsowdecyk` was not executed in this round** (no APK; no live staging credential exercise from this agent session). APK build not authorized.

## Wired (Mobile)

| Surface                             | Status                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Contract pin rc.4                   | Done                                                                                       |
| Transition RPC → `_status`          | Done                                                                                       |
| `admin_dashboard_stats`             | Wired + mapper + schema drift check                                                        |
| `admin_work_queue`                  | Wired + unknown type safe fallback                                                         |
| Commission approve/reject           | Wired; admin/owner UI + confirm + idempotency; staff read-only                             |
| Payout CTAs                         | Still disabled / non-interactive                                                           |
| suspend/reactivate partner          | Wired on Partners surface                                                                  |
| Directory `admin_list_*`            | Wired via Meer surfaces                                                                    |
| Settings / security summaries       | Wired                                                                                      |
| Internal notes RPC                  | `add_portal_support_internal_note`; staff list without customer `is_internal=false` filter |
| WhatsApp                            | Central `31628600727` NL/EN — prior remediation                                            |
| Admin tabs max 5 / leads under Meer | Prior remediation                                                                          |

## Local gates (this session)

| Gate                                                                     | Result                     |
| ------------------------------------------------------------------------ | -------------------------- |
| Unit: adminRc4 + ownerMapping + whatsapp + tabShell + a5 + rc3 messaging | PASS (scoped)              |
| `tsc --noEmit` (`.next` excluded)                                        | PASS                       |
| eslint (scoped RC4 files)                                                | see terminal               |
| Staging matrix `qzekuvmgfekzsowdecyk`                                    | **NOT RUN** → blocks READY |
| APK / AAB                                                                | **Not started** (policy)   |

## Open blockers

1. Staging functional/negative matrix with synthetic roles (customer…owner AAL2)
2. Confirm AAL2 step-up UX when Owner returns `AAL2_REQUIRED` (message mapped; no MFA enroll UI in app yet — fail-closed with clear copy)
3. Directory detail routes still alert “detail pending” (list RPC only — day-1 detail RPC absent)
4. Owner `support_internal_notes_rpc` flag may still FEATURE_DISABLE internal notes until enabled
5. Full clickability device pass on S25 after APK authorization

## APK readiness

Not ready. Requires green staging matrix + Owner authorization for one production-equivalent APK.
