# Authentication

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


## Model

- Single Supabase Auth account per person
- Roles live in `user_roles` (and existing `admin_roles` for web staff)
- **Never** authorize from mutable `user_metadata`; use DB roles / `app_metadata` only if synced server-side

## Flows

1. Email/password or magic link (configurable)
2. Email confirmation required in local config
3. Session stored via Expo SecureStore-backed Supabase client
4. JWT attached to PostgREST / Realtime / Functions

## Registration

- Default role: `customer`
- Partner path: submit `partner_applications` → role `partner_pending` until staff approval → `partner`
- Admin/staff: **not** available via public registration

## Security controls

- Short JWT expiry (1h local default); refresh handled by supabase-js
- Sensitive actions re-check `auth.uid()` in RLS
- Account deletion does not instantly invalidate all JWTs — revoke sessions as part of deletion runbook
