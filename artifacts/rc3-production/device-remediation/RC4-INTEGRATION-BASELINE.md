# RC4 Mobile integration — baseline (read-only)

**Date:** 2026-07-29
**Gate:** RC4 Owner contract integration — **no APK/AAB**

## Mobile identity

| Field                 | Value                                                                           |
| --------------------- | ------------------------------------------------------------------------------- |
| Path                  | `C:\Users\XXX\vdb-app`                                                          |
| Branch                | `fix/a5-owner-contract-runtime`                                                 |
| HEAD                  | `41f3378c60c1fa80f7c0a6202551d1731708134a`                                      |
| Package               | `nl.vdbdigital.app`                                                             |
| Installed APK (prior) | versionCode `2` / versionName `1.0.0` (S25; adb may be offline during baseline) |
| Prior contract pin    | `vdb-backend-contract@0.2.0-rc.3`                                               |
| Prior schemaVersion   | `2026.07.25.messaging-support-appointments-rc3`                                 |
| Target pin            | `vdb-backend-contract@0.2.0-rc.4`                                               |
| Target schemaVersion  | `2026.07.29.admin-control-surface-rc4`                                          |

## Owner identity (read-only verified)

| Field        | Value                                        |
| ------------ | -------------------------------------------- |
| Owner path   | `C:\Users\XXX\vdbdigital2.0`                 |
| Owner commit | `8e4d5f76c8ec609ca1f7bdf2f5553a07b773e591`   |
| Message      | `feat(owner): add rc4 admin control surface` |
| Staging      | `qzekuvmgfekzsowdecyk`                       |
| Production   | `nhsrdnjfsxfikfbdmdfj` untouched             |

## Dirty tree classification

### Modified (device-remediation WIP — keep)

| Path                                      | Class                                                  |
| ----------------------------------------- | ------------------------------------------------------ |
| `app/(admin)/_layout.tsx`                 | eerdere device-remediation (leads href:null)           |
| `app/(admin)/finance/index.tsx`           | eerdere device-remediation (unavailable CTAs)          |
| `app/(admin)/more/index.tsx`              | eerdere device-remediation (Meer items + WhatsApp)     |
| `app/(customer)/more/index.tsx`           | eerdere device-remediation (WhatsApp)                  |
| `app/(partner)/more/index.tsx`            | eerdere device-remediation (WhatsApp)                  |
| `src/lib/whatsapp.ts`                     | eerdere device-remediation                             |
| `src/config/env.ts`                       | eerdere device-remediation (comment)                   |
| `.env.example`                            | eerdere device-remediation (WhatsApp number)           |
| `eas.json`                                | eerdere device-remediation (WHATSAPP env)              |
| `src/i18n/locales/*/admin.json`           | eerdere device-remediation                             |
| `src/i18n/locales/*/messages.json`        | eerdere device-remediation                             |
| `src/api/repositories/adminRepository.ts` | eerdere device-remediation + **RC4-integratie target** |

### Untracked

| Path                                               | Class                                                    |
| -------------------------------------------------- | -------------------------------------------------------- |
| `src/config/whatsapp.ts`                           | eerdere device-remediation                               |
| `src/features/support/useWhatsAppContact.ts`       | eerdere device-remediation                               |
| `src/navigation/adminTabShell.ts`                  | eerdere device-remediation                               |
| `app/(admin)/more/surface/`                        | eerdere device-remediation (placeholders → RC4 activate) |
| `__tests__/unit/adminTabShell.test.ts`             | test                                                     |
| `__tests__/unit/whatsappConfig.test.ts`            | test                                                     |
| `artifacts/`                                       | evidence                                                 |
| `scripts/rc3-production-role-isolation-matrix.mjs` | pre-existing noise / prior gate script                   |

## Remaining `CONTRACT_SURFACE_UNAVAILABLE` (adminRepository)

- `admin_dashboard_stats` — **RC4 activate**
- `admin_work_queue` — **RC4 activate**
- `suspend_partner` — **RC4 activate**
- `approve_commission` / `reject_commission` — **RC4 activate**
- `process_payout_request` / `reject_payout_request` — **keep disabled**
- `create_project_from_request` / `mark_document_scan_clean` — deferred

## WhatsApp (already in WIP)

- Number `31628600727`, NL/EN templates, Customer/Partner/Admin Meer, no PII

## Navigation

- Admin: Home / Goedkeuringen / Tickets / Financiën / Meer; leads `href:null`
- Customer / Partner: unchanged role shells

## Env guards

- Production ref `nhsrdnjfsxfikfbdmdfj`; preview/staging `qzekuvmgfekzsowdecyk`
- Cross-env leakage hard-fails in `src/config/env.ts`

**No unrelated WIP cleaned.** Proceeding to RC4 pin + wiring.
