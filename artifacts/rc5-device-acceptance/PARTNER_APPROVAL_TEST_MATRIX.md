# PARTNER APPROVAL TEST MATRIX

**Date:** 2026-07-29

## Automated (local)

| # | Case | Coverage | Status |
|---|---|---|---|
| 1 | Approve CTA visible for OWNER | `ApprovalsScreen.test.tsx` | PASS |
| 2 | Tap → handler once via AAL2 wrapper | component | PASS |
| 3 | Cancel AAL2 → no approval + visible error | component | PASS |
| 4 | AAL2/RPC error → visible error | component | PASS |
| 5 | Reject without reason → no RPC | component | PASS |
| 6 | Reject with reason → one resume | component | PASS |
| 7 | Staff → read-only, no approve CTA | component | PASS |
| 8 | Double tap → one mutation | component | PASS |
| 9 | Approve RPC args `p_approve:true` | `partnerApprovalRpcContract.test.ts` | PASS |
| 10 | Reject RPC args `p_approve:false` + reason | unit | PASS |
| 11 | Empty id / empty reason validation | unit | PASS |
| 12 | Existing AAL2 state-machine tests | `aal2StepUp.test.ts` | PASS |

## Device (after new APK)

| # | Case | Status |
|---|---|---|
| D1 | OWNER AAL1 tap opens MFA modal | PENDING — needs new APK |
| D2 | Wrong TOTP → no approval | PENDING |
| D3 | Correct TOTP → one resume | PENDING |
| D4 | Synthetic PENDING only | PENDING |
| D5 | After staff approval partner not auto-ACTIVE | PENDING |
| D6 | Loading / disabled / error visible | PENDING |
