# Architecture — VDB Digital Mobile

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

> **Shared platform:** Mobile is a `MOBILE_CLIENT` against a canonical backend owned by VDB Digital 2.0. See `docs/shared-backend-architecture.md` and `AGENTS.md`.

## Overview

VDB Digital is an Expo (SDK 57) React Native client for customers, sales partners, and VDB staff.
The authoritative backend is Supabase (Auth, Postgres + RLS, Storage, Edge Functions, Realtime).
Mollie Hosted Checkout is used for payments; all payment secrets stay server-side.

```
┌─────────────────┐     HTTPS/JWT      ┌──────────────────────────┐
│ Expo app        │ ─────────────────► │ Supabase API / Auth      │
│ (nl.vdbdigital) │ ◄── Realtime ───── │ Postgres + RLS           │
└────────┬────────┘                    │ Storage (private docs)   │
         │                             │ Edge Functions           │
         │ deep links                  └───────────┬──────────────┘
         ▼                                         │ service role
┌─────────────────┐                    ┌───────────▼──────────────┐
│ vdbdigital.nl   │                    │ Mollie API + webhooks    │
│ /app/* links    │                    └──────────────────────────┘
└─────────────────┘
```

## Layers

| Layer            | Responsibility                                                   |
| ---------------- | ---------------------------------------------------------------- |
| UI (Expo Router) | Screens, navigation, i18n (NL/EN)                                |
| Domain hooks     | TanStack Query + repositories                                    |
| Repositories     | Typed interfaces over Supabase client                            |
| Edge Functions   | Checkout, webhooks, notifications, commission approval, deletion |
| Postgres + RLS   | Source of truth; constraints encode business rules               |

## Role model

- `customer` — own projects, quotes, invoices, chat, documents
- `partner_pending` / `partner` — leads, attributions, commissions (read); payout requests
- `staff` / `admin` / `owner` — operational and approval powers
- Existing remote `admin_roles` maps into staff/admin via helpers (see migrations)

## Non-goals for v1 mobile

- Partners collecting customer payments
- Client-side payment confirmation
- Public self-serve admin registration
