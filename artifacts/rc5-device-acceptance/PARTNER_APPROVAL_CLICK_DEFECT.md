# PARTNER APPROVAL CLICK DEFECT

**Date:** 2026-07-29  
**Classification:** `REAL_DEFECT — CLICKABLE APPROVAL CTA HAS NO OBSERVABLE EFFECT`  
**Device acceptance:** remains **BLOCKED** until new APK + retest

## Reproduction (staging)

| Field | Value |
|---|---|
| Environment | staging `qzekuvmgfekzsowdecyk` |
| Account | personal staging OWNER with verified MFA |
| Screen | Goedkeuringen `/(admin)/approvals` |
| CTA | `Partner goedkeuren` (`admin-partner-approve`) |
| Observed | tap received; no AAL2 modal; no loading; no error; no status change |

## Code path (pre-fix)

1. `app/(admin)/approvals/index.tsx` — `Button.onPress` → `onApprove(id)`
2. `onApprove` → `approvePartnerApplication(id, …)` **without** `useAal2StepUp`
3. `src/api/repositories/adminRepository.ts` → `rpcOwner(..., 'approve_partner_application', { p_application_id, p_reason })`
4. Owner mapping → `review_partner_application`
5. Errors thrown → **no catch / no UI error state** (`void onApprove(...)`)

## Category

**Primary: F. RPC_FAILED_SILENTLY**  
**Secondary: D. AAL2_FLOW_NOT_OPENED**

Not A/B (handler was wired). Not G (mutation did not succeed).
