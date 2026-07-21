# Maestro device results (Phase 7)

**Device:** Samsung S25 `R3GYC00EBYY` / `SM_S931B`  
**Combined device evidence:** **15/20 PASS** (two healthy suite segments)  
**Tag `vdb-mobile-v1-android-device-pass`:** not created (requires 20/20 in one clean validation)

## Combined PASS map

| Flow | Status | Evidence |
|---|---|---|
| 01-customer-auth | PASS | suite 2026-07-21_214508 |
| 02-project-request | PASS | same |
| 03-project-chat | PASS | same |
| 04-support-ticket | PASS | same |
| 05-document-review | PASS | same |
| 06-quote-acceptance | PASS | same |
| 07-test-checkout | PASS | same |
| 08-partner-application | PASS | same |
| 09-admin-partner-approval | PASS | same |
| 10-partner-lead | PASS | same |
| 11-commission-payout | PASS | same |
| 12-account-deletion | PASS | same |
| 13-appointments | PASS | suite from-13 `docs/_maestro-from13b.log` |
| 14-admin-project-creation | PASS | same |
| 15-document-version-2 | PASS | same |
| 16-checkout-browser-return | FAIL / OPEN | invoice detail assert; later auth flaky |
| 17-customer-document-upload | OPEN | not reached |
| 19-partner-payout | OPEN | not reached |
| 20-admin-ticket-reply | OPEN | not reached |
| 21-admin-finance | OPEN | not reached |

## Stabilization delivered

- Maestro driver APK pre-install (`scripts/run-maestro-device.mjs`)
- Safe password `LocalTestVdb2026` + login autofill off
- Harness refuses wrong Supabase kong (`vdbdigital2` port conflict)
- Password verify after seed (`scripts/verify-local-passwords.mjs`)
- Slim overlay dismissals; scroll to appointments; partner approve testIDs

## Blockers for 20/20

1. Docker: `supabase_db_vdb-digital-mobile-local` can exit; competing `vdbdigital2` reclaims :54321/:54322
2. Remaining flows 16–21 need one continuous healthy stack session
3. Full quality-gate re-run + cold-start logcat not completed in this pass

## Syntax

`npm run test:maestro:syntax` → 20/20 PASS (not device evidence).
