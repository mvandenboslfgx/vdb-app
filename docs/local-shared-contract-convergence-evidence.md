# Local shared-contract convergence evidence

**Date:** 2026-07-24
**Mobile baseline before pin:** `d701377`
**Owner branch:** `phase/shared-partner-backend`
**Partners:** pin docs updated to rc.2

**Honest end status:**

```text
LOCAL SHARED-CONTRACT CONVERGENCE PASS — STAGING STILL NOT AUTHORIZED
```

## Decisions

| Decision | Outcome |
|---|---|
| Canonical owner | VDB Digital 2.0 only |
| Publish Mobile 0.1.1? | **No** |
| Publish owner 0.1.0 to staging? | **No** |
| Base | Owner `0.2.0-rc.1` |
| Target | `0.2.0-rc.2` / `2026.07.24.mobile-compat-rc2` |

## Owner local proof

| Check | Result |
|---|---|
| Migration `20260724160000_mobile_compat_rc2.sql` applied on `supabase_db_vdbdigital2` | PASS |
| `verify_mobile_compat_contracts()` | **14/14** ok |
| `verify_partner_admin_contracts()` | **30/30** ok (partner surface intact) |
| Financial feature flags | all **false** |

## Client pins

| Client | Pin |
|---|---|
| Mobile | `contracts/backend-contract.json` → `0.2.0-rc.2` + mapping module/tests |
| Partners | `docs/backend-contract.md` → `0.2.0-rc.2` (partner surface compatible with rc.1) |

## Mobile local gates (isolated Mobile stack)

| Gate | Result |
|---|---|
| lint | PASS |
| typecheck | PASS |
| secret-scan | PASS |
| jest | PASS — **120** tests |
| Maestro syntax | PASS — **20/20** |
| RLS (local Mobile schema) | PASS — **65/65** |
| repo-integration (local Mobile schema) | PASS — **19/19** |

## Cross-client compatibility (local)

| Check | Result |
|---|---|
| Owner partner verifier | PASS 30/30 |
| Owner mobile compat verifier | PASS 14/14 |
| Mobile mapping unit tests | PASS |
| Partners docs pin = same package/schemaVersion | PASS |
| Runtime Mobile repos fully switched to portal_* calls | **Phased** — mapping module present; local Mobile SQL still used for isolated proof |

## EAS

| Check | Result |
|---|---|
| `npx eas-cli whoami` | **Not logged in** — operator must run interactive `npx eas-cli login` |
| `npx eas-cli project:info` | Blocked until login |

## Explicitly not done

- No staging project
- No remote migrations
- No production touch (`nhsrdnjfsxfikfbdmdfj`)
- No EAS secrets / build
- No push / tag
- Maestro noise left untouched
- Full Mobile repository rewrite onto `portal_*` RPCs is **mapped + tested**, runtime adapters still phased (local Mobile schema remains for isolated device/dev proof)
