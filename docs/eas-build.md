# EAS Build

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

## Profiles (expected in `eas.json`)

| Profile       | Use         |
| ------------- | ----------- |
| `development` | Dev client  |
| `preview`     | Internal QA |
| `production`  | Play Store  |

## Commands

```bash
eas build -p android --profile preview
eas build -p android --profile production
```

## Versioning

- `version` in `app.config.ts` (user-facing)
- `android.versionCode` auto-increment via EAS remote versioning (preferred)

## Secrets

Store Mollie / service role / Sentry auth in EAS secrets — never in git.

## Target SDK

Verify at build time via Expo/EAS logs (see `technology-decisions.md`).
