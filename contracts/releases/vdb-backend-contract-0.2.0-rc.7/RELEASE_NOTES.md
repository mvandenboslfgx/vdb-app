# vdb-backend-contract@0.2.0-rc.7

## Summary

Additive Partners v1 administrative partner review (B1 / Fase 2).

- New RPC `staff_attest_partner_admin_review(partner_id, outcome, reason_code)`
- Staff + AAL2 + rate limit; allowlisted outcomes/reason codes; no free-text PII
- `identity_verification_status=VERIFIED` means **administratieve partnercontrole afgerond**
- Does **not** imply camera/document/selfie/liveness/BSN/external IDV
- Does **not** change AGE or other activation checklist gates
- Does **not** activate partners; does not enable payouts
- Staging fixture RPC unchanged and must stay disabled in production
- schemaVersion stamps for admin/directory/checklist remain `2026.07.29.partner-approval-aal2-rc6`
- rc.5/rc.6 checksum drift is **not** repaired in those historical bundles

## Production

NOT AUTHORIZED.
