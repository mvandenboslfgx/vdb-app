# Mobile RC6 contract pin — provenance

**Worktree:** `C:\Users\XXX\vdb-app-rc6-staging-recovery`  
**Branch:** `fix/rc6-full-staging-recovery`  
**Date:** 2026-07-29  
**Re-vendor:** after Owner admin stamp migration metadata (`20260729145145`)

## Canonical pin

| Field | Value |
| --- | --- |
| packageId / contractVersion | `vdb-backend-contract@0.2.0-rc.6` |
| schemaVersion | `2026.07.29.partner-approval-aal2-rc6` |
| status | `CONSUMER_PIN_OWNER_RC6` |
| Owner baseline commit | `ccdeb8455696bf4381f2e6805e57e41aa3e51ca4` |

## Owner source (read-only)

Copied from:

`C:\Users\XXX\vdbdigital-rc6-aal2\contracts\releases\vdb-backend-contract-0.2.0-rc.6\`

into Mobile:

`contracts/releases/vdb-backend-contract-0.2.0-rc.6/`

## Checksum verification

Algorithm matches Owner `scripts/seal-contract-rc6-bundle.ts`:

1. SHA256 of every file except `checksums.json` / `BUNDLE_SHA256.txt`
2. Compare to `checksums.json`
3. `BUNDLE_SHA256 = sha256("<name>:<sha256>\n"… + trailing newline)`

| Check | Result |
| --- | --- |
| Per-file digests vs `checksums.json` | **PASS** (13 files) |
| Recomputed `BUNDLE_SHA256` | **PASS** |
| Expected `BUNDLE_SHA256` | `68a42dbba9708bd7dcce166de108b9940944b8285c0185e0209b9138a8d574d1` |

Superseded prior Mobile-vendored digest `6b4876255e199d36a472158627587acc1400eea5c00707726addc9a27a990d12` (pre–admin-stamp migration metadata).

## Fail-closed posture

- `supersededPins` lists RC5 / RC4 / RC3 / local remediation as **history only**
- No RC5/RC4 live fallback
- Runtime mappers assert `BACKEND_CONTRACT.schemaVersion` and throw `CONTRACT_DRIFT` on mismatch
- `partner_payouts` remains `false`; payout UI stays disabled

## Consumer pin files

- `src/config/backendContract.ts`
- `contracts/backend-contract.json`
- `docs/backend-contract.md`
