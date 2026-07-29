# VDB Digital — Software & Project Portal

Android package: `nl.vdbdigital.app`  
Stack: Expo SDK 57 · React Native 0.86 · React 19.2.3 · Supabase · Mollie

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

## What this app is

Production-oriented mobile portal for:

1. **Customers** — projects, documents, quotes, invoices, chat, support, appointments
2. **Sales partners** — applications, links/codes, leads, commissions, payouts
3. **Staff / admins** — approvals and operations (mobile subset; web remains primary)

## Quick start

```bash
cp .env.example .env
npm install
npx expo start
```

Local Supabase (optional, does **not** touch remote):

```bash
npx supabase start
npx supabase db reset
```

## Repository map

| Path                       | Contents                             |
| -------------------------- | ------------------------------------ |
| `app/`                     | Expo Router screens                  |
| `src/`                     | Domain, repositories, i18n, lib      |
| `supabase/migrations/`     | **NOT APPLIED** local SQL proposals  |
| `supabase/functions/`      | Edge function stubs                  |
| `docs/`                    | Architecture & runbooks (section 29) |
| `maestro/`                 | E2E flow skeletons                   |
| `.github/workflows/ci.yml` | Lint, typecheck, tests, scans        |

## Critical rules

- No secrets in git
- No remote migration apply without owner approval
- Partners never collect customer payments
- Mollie keys and service role are server-only
- Play Store policy gate controls in-app checkout by product category

## Documentation index

See `docs/` — start with `architecture.md`, `backend-schema-audit.md`, and `manual-owner-actions.md`.

## License

Proprietary — VDB Digital Software. See `LICENSE`.
