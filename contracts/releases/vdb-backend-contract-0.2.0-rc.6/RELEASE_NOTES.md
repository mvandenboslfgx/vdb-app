# vdb-backend-contract@0.2.0-rc.6

## schemaVersion

`2026.07.29.partner-approval-aal2-rc6`

## Summary

Security amendment on top of rc.5. Partner application approve/reject is a privileged
staff mutation and now requires a server-side AAL2 session, matching the AAL2 posture
already required for commission review and partner activate/suspend/reactivate.

### Security change — `review_partner_application`

Gate order (forward-only):

1. `AUTH_REQUIRED` when unauthenticated
2. `FORBIDDEN` unless `is_staff_admin()`
3. `AAL2_REQUIRED` via `require_aal2()` **before** any row mutation or success audit
4. Input validation (`VALIDATION_FAILED` for missing id / null approve / empty reject reason)
5. Row lock + terminal-state idempotency (`INVALID_TRANSITION` for non-`SUBMITTED` when mutating)
6. Approve / reject mutation
7. Audit (includes `schema_version`)
8. Soft activation checklist attempt (approval still commits; partner stays `PENDING` when blocked)

Consequences:

- OWNER/ADMIN sessions at AAL1 cannot approve or reject.
- Wrong TOTP / failed MFA step-up never reaches the mutation.
- Approval alone still never writes `ACTIVE` and never sets `payout_eligible=true`.

### Stamp

`admin_get_security_status.schema_version` → `2026.07.29.partner-approval-aal2-rc6`.

### Verifier

`verify_partner_approval_aal2_rc6_contracts` — AAL2 presence/order on review plus sibling
privileged RPC AAL2 checks.

### Unchanged from rc.5

Typed `submit_partner_application`, activation checklist, directory detail RPCs, fail-closed
staging fixture flag, payout/ledger invariants.

### Not authorized

Production apply, Mobile/Partners repo changes, APK/AAB, Vercel deploy, push/merge/tag.
