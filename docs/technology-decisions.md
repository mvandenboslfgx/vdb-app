# Technology Decisions

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


## Mobile stack

| Choice | Version / note | Why |
|---|---|---|
| Expo | SDK **57** | Managed workflow, EAS Build, OTA updates |
| React Native | **0.86** | Expo 57 baseline |
| React | **19.2.3** | Matches Expo 57 / RN 0.86 |
| Expo Router | file-based navigation | Deep links + typed routes |
| TypeScript | strict | Safety for money/roles flows |
| TanStack Query | server state | Caching, retries, offline-friendly |
| Zod + RHF | forms/validation | Shared schemas with edge payloads |
| i18next | NL + EN | Play Store + NL market |
| Sentry RN | observability | Crash + breadcrumb tracing |
| Maestro | E2E | Deterministic mobile flows |

## Backend

| Choice | Why |
|---|---|
| Supabase Auth | Email auth, JWT, RLS integration |
| Postgres RLS | Defense in depth for multi-tenant data |
| Edge Functions (Deno) | Mollie secrets, webhooks, privileged workflows |
| Mollie Hosted Checkout | PCI-light; customer pays VDB directly |

## Android target API

Documented target: **verify at build time via Expo/EAS**.

Do not hard-code an assumed `targetSdkVersion` in docs as authoritative.
Confirm from the EAS/`expo-build-properties` output for the release profile:

```bash
npx expo config --type public
eas build -p android --profile production --local   # or inspect build logs
```

## Explicit non-choices

- No Stripe in v1 (Mollie)
- No client-held service role keys
- No WebView-only app shell
