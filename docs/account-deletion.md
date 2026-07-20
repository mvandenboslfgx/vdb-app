# Account Deletion

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


## User flow

1. User opens Settings → Request deletion
2. App calls `request-account-deletion`
3. Row inserted in `account_deletion_requests` (`requested`)
4. Confirmation email / re-auth (`verified`)
5. Staff/automation processes (`processing` → `completed`)
6. App shows status

## Processing checklist (server)

- Revoke refresh sessions
- Anonymize `profiles` PII
- Soft-delete messages content where legally allowed
- Retain invoices/orders per financial retention
- Remove push tokens
- Disable partner codes/links
- Write `audit_logs`

## Play Store

Public deletion URL: `EXPO_PUBLIC_ACCOUNT_DELETION_URL` (also web form).
