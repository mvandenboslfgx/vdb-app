# Maestro root-cause audit (Phase 7)

**Date:** 2026-07-21  
**Best device score:** 12/20 PASS (`docs/maestro-device-results.md`)  
**Classification:** selectors / start-state / environment — not native crashes.

## Summary of root causes (ranked)

1. **ENVIRONMENT FAILURE** — Maestro driver APKs uninstalled after each session → startup timeout on S25 USB; fixed via adb pre-install.
2. **ENVIRONMENT FAILURE** — Competing local Supabase project `vdbdigital2` on ports 54321/54322; DB container exits mid-suite.
3. **WRONG TESTID / NAVIGATION** — Invented selectors; fixed to real `testID`s + role login + `clearState`.
4. **AUTH / AUTOCOMPLETE** — Password with `!` and Samsung Pass corrupted credentials; password `LocalTestVdb2026` + autofill off on login fields.
5. **INVALID YAML** — Flow 16 list-comment parse error (fixed).
6. **WRONG START STATE** — Admin approve button bound to list index 0 even when row 0 was not a partner application (fixed).
7. **TIMING / VISIBILITY** — `nav-appointments` below fold on More screen (scrollUntilVisible added).

## Per-flow (original → fix)

| Flow | Original class | Fix applied | Device (latest suite) |
|---|---|---|---|
| 01 | WRONG START / AUTH | clearState + shared login | PASS |
| 02 | WRONG TESTID | real project request IDs | PASS |
| 03 | MISSING TESTID | tab + chat IDs | PASS |
| 04 | MISSING TESTID | support nav IDs | PASS |
| 05 | MISSING TESTID | documents IDs | PASS |
| 06 | MISSING TESTID | quotes IDs | PASS |
| 07 | MISSING TESTID | invoices + checkout | PASS |
| 08 | MISSING TESTID | partner apply IDs | PASS |
| 09 | WRONG TESTID | first *partner_application* approve ID | PASS |
| 10 | AUTH STATE | partner login | PASS |
| 11 | MISSING / ENV | payout screen + healthy DB | PASS |
| 12 | WRONG TESTID | account deletion screen | PASS |
| 13 | MISSING / SCROLL | scroll to `nav-appointments` | FAIL → fix pending re-run |
| 14 | FEATURE GAP | approvals queue rewrite | BLOCKED |
| 15 | MISSING TESTID | same as docs | BLOCKED |
| 16 | INVALID YAML | parse fixed | BLOCKED |
| 17 | LANGUAGE | testIDs | BLOCKED |
| 19 | LANGUAGE | payout IDs | BLOCKED |
| 20 | AUTH STATE | admin login | BLOCKED |
| 21 | LANGUAGE + START | finance select + reason | BLOCKED |

## Remaining for 20/20

Keep `vdb-digital-mobile-local` exclusively on :54321 (stop `vdbdigital2`), reseed, run `npm run device:test:maestro`, then fix any REAL APP DEFECT without arbitrary sleeps.
