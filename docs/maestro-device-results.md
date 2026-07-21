# Maestro device results (recovery pass)

**Status:** `ANDROID TEST INFRASTRUCTURE BLOCKED — PRODUCTION NOT ACTIVATED`  
**Device:** Samsung S25 `R3GYC00EBYY` / `SM_S931B`  
**Suite denominator (auto-discovered):** **20** — see `docs/maestro-suite-manifest.md`  
**Tag `vdb-mobile-v1-android-device-pass`:** not created

## A. Suite manifest

Executable flows = `maestro/<NN>-*.yaml` at suite root → **20 files**.  
Numbering gap: no `18-*.yaml`. Reporting “16–21” means prefixes, not 21 flows.

Score label must be **`20/20`**, never a hard-coded claim that disagrees with discovery.

## B. Latest evidence (this recovery)

### Open-flow subset (one runner session after clean reset)

| Flow | Result | Duration |
|---|---|---|
| 16-checkout-browser-return | **PASS** | 176.8s |
| 17-customer-document-upload | **PASS** | 137.1s |
| 19-partner-payout | **PASS** | 100.2s |
| 20-admin-ticket-reply | **PASS** | 103.2s |
| 21-admin-finance | **PASS** | 93.8s |

Log: `docs/_maestro-from-16.log` · JSON: subset in `docs/maestro-device-results.latest.json` (overwritten by later runs).

**This subset is not a full-suite PASS.**

### Full suite attempt (single `device-suite.yaml` session)

| Field | Value |
|---|---|
| Start | 2026-07-21T21:39:58Z |
| End | 2026-07-21T21:42:35Z |
| Score | **0/20** (01 FAIL, 02–21 BLOCKED) |
| Failure | Login stayed on `auth-login-screen`; UI showed wrong credentials + `fetch failed: unexpected end of stream on http://127.0.0.1:54321` |
| Root cause | Competing `vdbdigital2` stack / mid-request API cut (see stability doc §6 hostile watchdog) |

Log: `docs/_maestro-full-suite.log`

## C. Historical combined map (not definitive)

Earlier segments reached ~15/20 across multiple runs. Combined maps are **historical only** and do not justify the android-device-pass tag.

## D. Harness improvements shipped

- Auto-discovered denominator (`scripts/maestro-suite-manifest.mjs`)
- Hard fail on wrong stack / missing Metro / missing APK / unhealthy DB
- `device:test:reset` waits for auth after `db reset`, pins APK SHA-256, clears app data
- Font load no longer redboxes the whole app when Metro flaps
- Pre-flow removal of `*vdbdigital2*` containers only

## E. Blocker for tag

One uninterrupted **20/20** run requires exclusive Docker: stop the parallel `vdbdigital2.0` Cursor agent watchdog that force-removes `vdb-digital-mobile-local` containers.
