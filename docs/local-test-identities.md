# Local test identities (LOCAL ONLY)

> **These accounts exist only on local Supabase.**  
> They are **not** production secrets and must **never** be created on remote project `nhsrdnjfsxfikfbdmdfj`.

## Shared password

```
LocalTestVdb2026
```

Documented here intentionally for local Maestro / manual QA. Rotate nothing in production based on this file.

## Users

| Email | App role | Notes |
|---|---|---|
| `customer.a@local.vdb` | customer | Owns seeded project, quote, ticket, chat |
| `customer.b@local.vdb` | customer | Isolation counterpart (invoice B) |
| `partner.pending@local.vdb` | partner_pending | Application `submitted` |
| `partner.active.a@local.vdb` | partner | Active profile + code `PARTNERA` + commission |
| `partner.active.b@local.vdb` | partner | Second active partner |
| `partner.suspended@local.vdb` | partner | Profile `is_active=false`, application suspended |
| `staff@local.vdb` | staff | Project owner / chat participant |
| `admin@local.vdb` | admin | Elevated staff |
| `owner@local.vdb` | owner | Elevated staff |

## How to seed

```bash
npx supabase db reset
node scripts/seed-local-identities.mjs
```

`supabase/seed.sql` only seeds feature flags. Identities and sample domain rows come from `scripts/seed-local-identities.mjs` (idempotent; safe to re-run after reset).

## RLS suite

```bash
node scripts/run-rls-suite.mjs
```
