# Production Migration Runbook

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


## Current state

Migrations in this repo are **NOT APPLIED** to remote Supabase `nhsrdnjfsxfikfbdmdfj`.

## Preconditions (owner)

1. Written approval to apply
2. Maintenance window scheduled
3. Logical backup / PITR confirmed
4. Staging project dry-run completed
5. App min version compatible with new schema

## Steps (when approved)

1. Tag release commit
2. Take backup
3. Apply migrations in order under `supabase/migrations/`
4. `supabase db push` **only** with owner present OR paste SQL in SQL editor with review
5. Deploy edge functions
6. Seed `feature_flags` (keep risky flags **false**)
7. Smoke test auth, RLS, checkout sandbox
8. Record applied versions in change log

## Rollback

Prefer forward-fix. If catastrophic:

1. Restore from backup
2. Disable feature flags / force app update gate
3. Incident notes in `audit_logs` / ops channel

## Forbidden without approval

- `supabase db push --linked` from CI
- Dropping existing remote tables
- Disabling RLS
