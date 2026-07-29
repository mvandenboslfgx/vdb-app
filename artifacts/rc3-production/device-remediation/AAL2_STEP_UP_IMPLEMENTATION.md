# AAL2 step-up implementation (Mobile Phase 1)

## Verdict contribution

Mobile now has an interactive AAL2 step-up path for sensitive admin/owner mutations. Cancel remains fail-closed. No APK.

## Research (existing architecture)

| Area                | Finding                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| Owner web MFA       | `vdbdigital2.0` uses `mfa.listFactors` + `mfa.challenge` + `mfa.verify` + AAL re-read |
| Mobile session      | Supabase JS + Expo SecureStore adapter (`src/lib/supabase.ts`), PKCE, persistSession  |
| Prior Mobile AAL UX | Fail-closed copy only (`admin.aal2Required`) — insufficient for day-1                 |
| Enrollment          | Owner web has full enroll/QR; Mobile **does not** invent QR enrollment in Phase 1     |

## Implementation

| Piece         | Path                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| Core helpers  | `src/lib/auth/aal2.ts`                                                    |
| Modal UX      | `src/features/auth/aal2/Aal2StepUpModal.tsx`                              |
| Hook          | `src/features/auth/aal2/useAal2StepUp.ts`                                 |
| Wired screens | `app/(admin)/finance/index.tsx`, `app/(admin)/more/surface/[surface].tsx` |
| i18n          | `src/i18n/locales/{nl,en}/admin.json` (`aal2.*`)                          |
| Tests         | `__tests__/unit/aal2StepUp.test.ts`                                       |

## Flow

1. Sensitive action starts (commission approve/reject, partner suspend/reactivate).
2. `getAal2Status()` reads AAL + verified TOTP factor.
3. If AAL2 → run action once (same idempotency key).
4. If no verified factor → **enrollment-required** state (no Mobile enroll invent).
5. If AAL1 + factor → modal: explain → TOTP (secure input) → `challenge` + `verify` → `refreshSession` → re-read AAL.
6. On verified → resume **original action once**.
7. Cancel / failed verify → no mutation (fail-closed).
8. Server `AAL2_REQUIRED` race → one more step-up attempt, then one resume; no mutation loop.

## Sensitive actions covered

- `approve_partner_commission` / `reject_partner_commission` (via finance UI)
- `suspend_partner` / `reactivate_partner` (via partners surface)

Payout mutations remain Owner-disabled (non-interactive).

## Enrollment gap (exact)

- Mobile shows enrollment-required copy pointing to Owner web admin MFA setup.
- Needed later (not Phase 1 invent): Mobile enroll UI (QR/secret), unverified-factor cleanup, deep-link to web enroll if desired.
- Backend already supports enroll via Supabase Auth; client enrollment UX is the missing piece.

## Security rules observed

- No TOTP / token / secret logging
- No AAL1 bypass
- No automatic repeated mutation beyond one intentional resume
- Cancel = fail-closed
