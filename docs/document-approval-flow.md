# Document Approval Flow

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

## Storage

Private Supabase Storage buckets only. Signed URLs with short TTL.
Never public buckets for customer/project files.

## Versioning

- Each upload creates a new `document_versions` row (`version_number` monotonic)
- Approved versions are never silently overwritten
- New version resets review cycle (`under_review`)

## Statuses

`draft` → `uploaded` → `processing` → `available` → `under_review` → `approved` | `changes_requested` | `rejected`  
Also: `superseded`, `archived`

## Scan statuses

`pending` | `clean` | `flagged` | `failed`

If no virus-scan provider is configured (`feature_flags.documents.virus_scan=false`):

- Do not claim malware protection
- Still enforce MIME + size limits
- Treat as **not production-complete** for high-sensitivity files

## Customer actions

When `requires_customer_approval`:

- Approve → `approved`
- Request changes → requires comment → `changes_requested` + notify staff
