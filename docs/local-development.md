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

## Local Supabase (optional)

```bash
npx supabase start
npx supabase db reset   # applies LOCAL migrations only
```

Studio: `http://127.0.0.1:54323`  
API: `http://127.0.0.1:54321`

Point `.env` `EXPO_PUBLIC_SUPABASE_URL` / anon key at local values from `supabase status`.

## Forbidden

- `supabase db push` to remote
- Applying migrations to `nhsrdnjfsxfikfbdmdfj` without owner approval
