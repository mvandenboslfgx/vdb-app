# RC5 STAGING APK READINESS — SUSPENDED FIXTURE CONTRACT TESTS

**Date:** 2026-07-29  
**Unit test file:** `__tests__/unit/rc5SuspendedFixtureContract.test.ts`  
**Staging validate script:** `scripts/rc5-suspended-staging-validate.mjs`  
**Vault check script:** `scripts/rc5-vault-readiness-check.mjs`

## Fixture

| Field | Value |
|---|---|
| Kind | `SUSPENDED_PARTNER_RC5` |
| Fingerprint | `099764f54e18` |
| Status | `SUSPENDED` |
| `payout_eligible` | `false` |
| Staging ref | `qzekuvmgfekzsowdecyk` |
| Production ref | NOT present in vault |

## Vault checks (rc5-vault-readiness-check.mjs)

| Check | Result |
|---|---|
| `sus_vault_exists` | PASS |
| `sus_staging_ref_matches` | PASS |
| `sus_fixture_kind_matches` (`SUSPENDED_PARTNER_RC5`) | PASS |
| `sus_fingerprint_matches` (`099764f54e18`) | PASS |
| `sus_no_production_ref` | PASS |

## Unit tests (rc5SuspendedFixtureContract.test.ts) — 26 tests PASS

### Role gating contract

| Check | Result |
|---|---|
| Fixture kind matches constant | PASS |
| Fixture fingerprint matches handoff | PASS |
| Fixture status is SUSPENDED | PASS |
| `payout_eligible` is false | PASS |
| Staging ref is not production | PASS |
| Suspended effective roles: no partner access | PASS |
| Suspended effective roles: no admin access | PASS |
| `partner_pending` is not active partner | PASS |
| Resolves to public/customer area (not partner) | PASS |

### Capability fail-closed

| Check | Result |
|---|---|
| Catalog requires active partner role | PASS |
| Lead create gated by partner area access | PASS |
| Sale confirm gated by partner area access | PASS |
| Commission action gated by partner area access | PASS |
| Payout doubly fail-closed (role + feature flag) | PASS |
| Admin route denied | PASS |
| Owner route denied | PASS |

### Session isolation

| Check | Result |
|---|---|
| Logout resolves to public — no suspended data in route | PASS |
| Re-login as suspended stays non-partner area | PASS |
| Internal notes inaccessible (admin-only RPC) | PASS |
| Cross-partner lead read gated | PASS |

### Repository contract layer

| Check | Result |
|---|---|
| adminRepository surfaces require admin role | PASS |
| Partner commission actions require active partner role | PASS |
| No write mutation possible for suspended partner on Mobile | PASS |

### Staging validation script reference

| Check | Result |
|---|---|
| `scripts/rc5-suspended-staging-validate.mjs` exists | PASS |

## Staging validation script (rc5-suspended-staging-validate.mjs)

Read-only staging validation script is ready. Performs:

1. Login with vault credentials (staging only, refuses production)
2. Server profile status check (`SUSPENDED`, `payout_eligible=false`)
3. Session restore check
4. Catalog listing deny
5. Lead create deny
6. Commission action deny
7. Payout action deny
8. Admin RPC deny
9. Cross-partner lead read deny
10. Internal notes RPC deny
11. Logout wipes session
12. Re-login remains SUSPENDED

**No credentials hardcoded. No financial mutations. No fixture status changes.**

## Verdict

**SUSPENDED_FIXTURE_CONTRACT_TESTS: PASS — 26/26 unit tests**  
Staging validation script: ready for live staging run when network access available.
