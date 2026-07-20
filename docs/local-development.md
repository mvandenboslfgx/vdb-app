# Local Development

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


## Prerequisites

- Node 20+
- Expo CLI / `npx expo`
- Docker (for local Supabase)
- Android Studio / device for emulator

## App

```bash
cp .env.example .env
npm install
npx expo start
```

## Local Supabase (required for real data)

```bash
npx supabase start
npx supabase db reset          # applies LOCAL migrations only
npm run db:seed:identities     # local test users (see docs/local-test-identities.md)
npm run db:types               # regenerate src/types/database.generated.ts
npm run test:rls               # multi-user RLS suite
npm run test:repo-integration  # Auth + repository API checks
```

Point `.env`:

```env
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_ENABLE_DEMO_MODE=false
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon from supabase status>
```

Studio: `http://127.0.0.1:54323`  
API: `http://127.0.0.1:54321`

Demo mode (`EXPO_PUBLIC_ENABLE_DEMO_MODE=true`) is explicit only — repositories never fall back to mocks on network/DB errors.

## Maestro

```bash
npm run test:maestro:syntax   # validates YAML; does not claim device PASS
```

Device execution requires Android SDK + `adb` — see `docs/windows-android-setup-exact.md`.

## Forbidden

- `supabase db push` to remote
- Applying migrations to `nhsrdnjfsxfikfbdmdfj` without owner approval
