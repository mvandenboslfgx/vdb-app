# Privacy & Retention

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

## Lawful basis (draft — owner/legal must confirm)

- Contract performance (projects, invoices, support)
- Legitimate interest (security logs, fraud holds)
- Consent (marketing push, optional reviews publication)

## Data categories

- Account identifiers, contact data
- Project/communication content
- Billing documents
- Device push tokens
- Partner payout account details (encrypted at rest)

## Retention (proposed defaults)

| Data                  | Retention                        |
| --------------------- | -------------------------------- |
| Financial records     | 7 years (NL tax)                 |
| Support messages      | 3 years after close              |
| Audit logs            | 2+ years                         |
| Push tokens           | Until logout / inactive 180 days |
| Soft-deleted profiles | Purge after deletion SLA         |

Exact periods require owner/legal sign-off — see `manual-owner-actions.md`.

## Consent

Reuse remote `consent_records` and mobile `terms_acceptances`.
