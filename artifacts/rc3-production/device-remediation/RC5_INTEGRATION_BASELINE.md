# RC5 Integration Baseline (pre-change)

```text
Repository: C:/Users/XXX/vdb-app
Branch: fix/a5-owner-contract-runtime
HEAD: 41f3378c60c1fa80f7c0a6202551d1731708134a
HEAD message: fix: disable Sentry auto-upload on production EAS builds
```

## Contract (before RC5 pin)

| Field         | Value                                  |
| ------------- | -------------------------------------- |
| packageId     | `vdb-backend-contract@0.2.0-rc.4`      |
| schemaVersion | `2026.07.29.admin-control-surface-rc4` |

## Owner RC5 source (read-only)

| Field           | Value                                       |
| --------------- | ------------------------------------------- |
| Owner repo      | `C:/Users/XXX/vdbdigital2.0`                |
| Owner commit    | `8264893c25ba6438393c0469fcc623c68fbfa93d`  |
| Target contract | `vdb-backend-contract@0.2.0-rc.5`           |
| Target schema   | `2026.07.29.partner-identity-directory-rc5` |
| Staging         | `qzekuvmgfekzsowdecyk`                      |
| Production      | `nhsrdnjfsxfikfbdmdfj` untouched            |

## Current Mobile capabilities (pre-RC5)

| Area               | State                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| AAL2 step-up       | Implemented (Phase 1) — finance commissions + partner suspend/reactivate                                            |
| Directory lists    | `admin_list_*` wired; row tap → "Nog niet beschikbaar"                                                              |
| Directory details  | Missing — S3 blocker                                                                                                |
| Internal notes     | `add_portal_support_internal_note` wired; list via table/staff messages; flag was FEATURE_DISABLED on earlier probe |
| Partner intake     | Optional company/KVK; Owner RPC without `p_partner_type` (rc.4 signature) — **must update to 7-arg typed**          |
| Partner type model | Dependency recorded (S6); no INDIVIDUAL/BUSINESS yet                                                                |
| Env guards         | staging/production ref checks present                                                                               |
| Installed APK      | No device attached; prior reference package `nl.vdbdigital.app` versionCode `2` (old defect build) — not claimed    |

## Dirty tree classification

### RC4-remediation / RC5-integratie precursor (keep)

| Path                                                                                                              | Class                                     |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `app/(admin)/_layout.tsx`, `more/index.tsx`, `finance/index.tsx`, `index.tsx`, `tickets/[id].tsx`                 | RC4-remediation                           |
| `app/(admin)/more/surface/`                                                                                       | RC4-remediation → becomes RC5 detail host |
| `app/(customer)/more/*`, `app/(partner)/more/index.tsx`                                                           | RC4-remediation                           |
| `src/api/contract/*`, `adminRc4Mappers.ts`, `adminRepository.ts`, `partnersRepository.ts`, `supportRepository.ts` | RC4-remediation → RC5                     |
| `src/config/backendContract.ts`, `contracts/backend-contract.json`                                                | RC4 pin → RC5 pin                         |
| `src/features/auth/aal2/`, `src/lib/auth/`, `src/config/whatsapp.ts`, `src/navigation/adminTabShell.ts`           | RC4-remediation                           |
| `src/validation/partner.ts`, `src/providers/AuthProvider.tsx`                                                     | RC4-remediation → RC5 partner type        |
| `__tests__/unit/aal2*`, `adminTabShell*`, `whatsapp*`, `partnerParticulier*`, `sessionCache*`, `adminRc4*`        | test                                      |
| `artifacts/rc3-production/device-remediation/*`                                                                   | evidence                                  |
| `scripts/rc4-*.mjs`                                                                                               | test/evidence harness                     |
| `contracts/owner-rc4-*.json`                                                                                      | evidence/generated pin helpers            |
| `eas.json`, `.env.example`, `src/config/env.ts`, `tsconfig.json`                                                  | RC4-remediation / env                     |
| i18n admin/partners/messages                                                                                      | RC4-remediation                           |

### Pre-existing / noise (do not clean)

| Path                                                                             | Class                         |
| -------------------------------------------------------------------------------- | ----------------------------- |
| Broader `artifacts/` (apk dumps, role-matrix screenshots, production build logs) | pre-existing noise / evidence |
| Unrelated modified unit tests already in tree                                    | test / pre-existing           |

No unrelated WIP deleted or reformatted.

## Remaining placeholders / CONTRACT_SURFACE_UNAVAILABLE (pre-RC5)

- Directory detail routes → Alert unavailable
- Payout mutations → CONFIGURATION unavailable
- Some legacy admin surfaces still throw CONTRACT_SURFACE_UNAVAILABLE for non-rc.4 RPCs

## Plan after baseline

1. Pin rc.5
2. Wire `admin_get_*` + `list_portal_support_ticket_replies`
3. Detail screens + clickability
4. Typed partner intake + activation checklist UI
5. Staging matrix + evidence + verdict
