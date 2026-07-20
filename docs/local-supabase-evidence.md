# Local Supabase evidence (Phase 2)

**Date:** 2026-07-20  
**Remote mutations:** none  
**Local project:** `vdb-digital-mobile-local`

## Commands executed

```bash
npx supabase stop --project-id vdbdigital2   # free port 54322
npx supabase start
```

BOM stripped from migration SQL files (was blocking apply).  
Role helpers moved to `20260720100150_role_helpers.sql` (after `user_roles`).

## Result

- All additive migrations applied on local Docker Postgres
- Seed `supabase/seed.sql` applied (fail-closed feature flags)
- API: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

## Keys

Use `npx supabase status -o env` locally. **Do not commit** anon/service keys from local defaults into git beyond `.env.example` placeholders.

## Remote

Official candidate `nhsrdnjfsxfikfbdmdfj` remains **NOT APPLIED**. See `docs/official-backend-verification.md`.
