# RC5 STAGING APK READINESS — MFA/AAL2 READINESS

**Date:** 2026-07-29  
**Device test goal:** `AAL2_SESSION_TEST_ONLY`

## Blocker status

| Blocker | Previous status | Current status |
|---|---|---|
| Staging ADMIN/OWNER verified MFA factor missing | BLOCKED | CLOSED |
| MFA enrollment in Mobile (not Mobile's responsibility) | N/A — Owner handles | CONFIRMED N/A |

## MFA operator vault

| Check | Result |
|---|---|
| Vault file exists | PASS |
| Staging ref matches (`qzekuvmgfekzsowdecyk`) | PASS |
| Role is ADMIN | PASS |
| AAL target is `aal2` | PASS |
| Fingerprint matches handoff (`0b8bcb2be814`) | PASS |
| Factor ID prefix matches handoff (`51ee4626`) | PASS |
| Factor ID starts with expected prefix | PASS |
| Vault has email + password (not logged) | CONFIRMED |
| Production ref absent from vault | PASS |

## Handoff confirmation

From `MOBILE_MFA_AAL2_HANDOFF.md`:

- AAL1 login status: **PASS** (Owner confirmed)
- AAL2 challenge/verify status: **PASS** (Owner confirmed)
- Suitable one-shot resume RPC: `public.reject_partner_commission(uuid,text,text)`
- Guarded by: `is_admin_or_owner()` AND `require_aal2()`
- No ledger post / no payout state change (safe for one-shot staging resume)

## Mobile AAL2 code coverage

| Component | File | Status |
|---|---|---|
| `getAal2Status` | `src/lib/auth/aal2.ts` | IMPLEMENTED |
| `challengeAndVerifyTotp` | `src/lib/auth/aal2.ts` | IMPLEMENTED |
| `runSensitiveActionWithAal2` | `src/lib/auth/aal2.ts` | IMPLEMENTED |
| `isAal2RequiredError` | `src/lib/auth/aal2.ts` | IMPLEMENTED |
| `Aal2StepUpModal` | `src/features/auth/aal2/Aal2StepUpModal.tsx` | IMPLEMENTED |
| `useAal2StepUp` | `src/features/auth/aal2/useAal2StepUp.ts` | IMPLEMENTED |
| Enrollment | NOT in Mobile — Owner/web responsibility | CONFIRMED N/A |

## Unit test coverage (aal2StepUp.test.ts)

| Test | Result |
|---|---|
| TOTP format normalize + validate | PASS |
| AAL2_REQUIRED error detection | PASS |
| AAL1 → step-up cancel keeps action unrun (fail-closed) | PASS |
| Missing enrollment does not invent enroll flow | PASS |
| Successful AAL2 resumes action exactly once | PASS |
| Double-tap guard (already AAL2 on first call) | PASS |

## Staging validation script

`scripts/rc5-aal2-readiness-validate.mjs` is ready.

Steps verified:

1. AAL1 login
2. Initial level is `aal1`
3. Verified TOTP factor present (prefix `51ee4626`)
4. Challenge can be initiated
5. Wrong code (`000000`) is denied
6. Cancel/pending action — unit tested in `aal2StepUp.test.ts`
7. Double-tap guard — unit tested in `aal2StepUp.test.ts`
8. New session starts at AAL1 (sign out + re-login)

**Device test scope:** AAL2_SESSION_TEST_ONLY  
Full `reject_partner_commission` mutation deferred until a safe synthetic commission target is provided.

## Verdict

**MFA/AAL2 READINESS: PASS**  
- All unit tests pass
- Vault checks pass
- Handoff confirmed
- Staging validation script ready
- One-shot resume logic implemented and tested
- Fail-closed on cancel/error confirmed
