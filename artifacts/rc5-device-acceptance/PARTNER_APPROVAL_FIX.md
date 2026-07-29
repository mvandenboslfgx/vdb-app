# PARTNER APPROVAL FIX

**Date:** 2026-07-29  
**Scope:** Mobile client only — no Owner/Partners/production changes

## Changes

### `src/api/repositories/adminRepository.ts`

- Approve → `{ p_application_id, p_approve: true }`
- Reject → `{ p_application_id, p_approve: false, p_rejection_reason }`
- Validate empty id / empty rejection reason
- Map Owner uuid return → `{ id, status }`
- Comments corrected: staff approval does **not** auto-activate (RC5)

### `app/(admin)/approvals/index.tsx`

- Wire `useAal2StepUp` + `Aal2StepUpModal`
- Visible `actionError` on cancel / enrollment / RPC failure
- Admin/owner capability gate; staff read-only
- Reject reason input (min 8 chars) + disabled reject until valid
- Loading/disabled lock during execution
- Synchronous `busyLockRef` for double-tap guard
- Refetch list after successful review

## Security / UX constraints met

- No email hardcode
- No OWNER bypass
- No AAL2 relaxation
- No direct table writes
- Owner RPC remains authoritative
- Approval alone does not claim ACTIVE
- No payout/Mollie/checkout changes

## New APK required

Installed S25 APK still contains the broken bytecode.  
Local code fix is **not** a device PASS. A new internal staging APK is required before retest.
