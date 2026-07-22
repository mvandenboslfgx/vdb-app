# Shared backend architecture

**Repository role:** `MOBILE_CLIENT`
**Updated:** 2026-07-22
**Status:** architecture freeze — no remote apply from this repo

## Intent

VDB Digital website, Mobile, and Partner Portal / Affiliate remain **three separate repositories**.
They form one platform by sharing **one** Supabase Auth, database, Storage, Realtime surface, and secured RPCs — not by merging codebases.

```text
VDB Digital website ───────┐
VDB Digital app ───────────┼── Shared Supabase (staging / production)
Affiliate/Partner Portal ──┘

Locally: three isolated stacks (unique project_id + ports + volumes)
```

## Environment rule

| Environment | Backend |
|---|---|
| Local development | Each repo’s own Supabase stack |
| Shared staging | Same staging Supabase project |
| Production | Same production Supabase project |

**Local apart, staging and production together.**

## Canonical owner

**VDB Digital 2.0** owns the definitive schema, RLS, Storage policies, DB functions, financial RPCs, Edge Functions, Mollie webhooks, and published TypeScript database types.

Mobile may propose backend changes and apply them **only** on its local stack for tests. Remote production migrations from Mobile are forbidden.

## Identity

One `auth.users` / `profiles` / role model across all clients:

`customer` · `partner_pending` · `partner` · `staff` · `admin` · `owner`

## Shared data (same rows, different frontends)

### Website + Mobile

profiles, projects, milestones, chat, support tickets, documents, quotes, invoices, payments, appointments, reviews

### Partner Portal + Mobile

partner profiles/applications/codes, leads, sales, commissions, payouts, marketing assets

No separate “mobile commissions” vs “affiliate commissions” — one commission record, multiple UIs.

## Isolation (non-negotiable)

This Mobile agent must **never**:

- modify sibling repository files;
- stop/remove sibling Docker containers;
- claim sibling ports;
- kill global Node/PowerShell processes belonging to siblings;
- apply remote migrations or production actions without explicit owner approval.

On conflict: report, stop **only** this repo’s own process, leave siblings untouched.

## Contract

Versioned contract: `vdb-backend-contract@0.1.0` (`schemaVersion` `2026.07.22.freeze`) in `contracts/backend-contract.json`.
See `docs/backend-contract.md`.
