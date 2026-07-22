# Staging integration plan

**Status:** planning — staging project not yet provisioned in this audit
**Repository role:** `MOBILE_CLIENT`

## Goal

Prove cross-client coupling against **one** shared staging Supabase without touching production data.

```text
Website (staging build) ──┐
Mobile (preview/staging) ─┼── VDB Digital Staging Supabase
Partner Portal (staging) ─┘
```

## Prerequisites (owner)

1. Create Supabase project e.g. `VDB Digital Staging`
2. Apply **canonical** migrations from VDB Digital 2.0 only
3. Issue publishable keys to all three repos (no service role in Mobile)
4. Anonymized seed / synthetic fixtures only — no raw production dump
5. Publish contract `schemaVersion` for staging

## Mobile configuration (when ready)

```env
EXPO_PUBLIC_APP_ENV=preview
EXPO_PUBLIC_SUPABASE_URL=<same staging URL>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<same staging publishable key>
EXPO_PUBLIC_ENABLE_DEMO_MODE=false
```

Optional later: `EXPO_PUBLIC_BACKEND_CONTRACT_VERSION=<schemaVersion>`.

## What staging must prove

- Same Auth users across website / app / portal
- Same projects, leads, commissions, payouts rows
- Same RLS enforcement
- Same RPC behaviour
- Realtime updates visible across clients

## Explicit non-goals until green

- Production migration from Mobile
- Live Mollie production keys
- Copying real customer PII into staging without anonymization

## Exit criteria before production coupling work

1. Staging contract version pinned in all three clients
2. Cross-repository scenarios in `docs/cross-repository-test-plan.md` pass on staging
3. Owner sign-off
