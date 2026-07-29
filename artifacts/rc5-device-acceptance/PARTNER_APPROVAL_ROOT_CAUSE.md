# PARTNER APPROVAL ROOT CAUSE

**Date:** 2026-07-29

## Root cause (proven)

### 1. Wrong Owner RPC argument shape (hard fail)

Owner RC5 canonical signature:

```text
review_partner_application(
  p_application_id uuid,
  p_approve boolean,
  p_rejection_reason text DEFAULT NULL,
  p_partner_code text DEFAULT NULL
)
```

Mobile called (pre-fix):

```ts
rpcOwner(supabase, 'approve_partner_application', {
  p_application_id: id,
  p_reason: reason, // WRONG — not an Owner arg
  // missing required p_approve
});
```

PostgREST/Postgres rejects the call. The button therefore never completes a successful approval.

Evidence source: Owner contract  
`vdb-backend-contract@0.2.0-rc.5` / migration `…_partner_identity_directory_rc5_activation.sql`.

### 2. Silent client failure (no observable UX)

`ApprovalsScreen.onApprove` used `try/finally` **without** `catch` and was invoked via `void onApprove(...)`.

Release builds swallow the unhandled rejection → user sees **nothing**.

### 3. AAL2 step-up never opened

Unlike `app/(admin)/finance/index.tsx`, Approvals had:

- no `useAal2StepUp`
- no `Aal2StepUpModal`
- no cancel/error messaging for MFA

So even after fixing the RPC args, AAL1→AAL2 UX was missing from this screen.

## What it was not

| Hypothesis | Result |
|---|---|
| Missing `onPress` | Rejected — handler present |
| Overlay intercept | Rejected — Button Pressable receives press |
| Capability silent false | Rejected — OWNER role; no capability gate existed |
| Stale UI after success | Rejected — RPC never succeeded |
| Owner/backend config-only | Rejected — Mobile args + UX broken |

## Stop point

```text
Tap → onApprove → approvePartnerApplication → rpcOwner(wrong args)
  → server error → unhandled rejection → no modal / no error UI
```
