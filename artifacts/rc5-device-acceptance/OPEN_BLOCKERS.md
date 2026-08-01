# RC5 DEVICE ACCEPTANCE — OPEN BLOCKERS

**Date:** 2026-07-29

## Blocking device acceptance

| Item | Status |
|---|---|
| Partner approval CTA silent fail | **ROOT CAUSE FIXED LOCALLY** — new APK required |
| Current S25 APK contains old approval code | BLOCKING retest |
| Handmatige S25 matrices unfinished on fixed binary | BLOCKED until new APK |

## Still out of scope / deferred

| Item | Status |
|---|---|
| `reject_partner_commission` full E2E | DEFERRED — no safe synthetic target |
| External IDV / payout / Mollie / checkout | DISABLED / fail-closed (IDV de-scoped v1) |
| AAB / Play Store | NOT AUTHORIZED |
| Owner RC5 production promotion | PENDING |

## Not started this gate

- Second EAS build
- APK install of a fixed binary
- Device acceptance PASS claim
