# Manual owner actions — Matthijs

Ordered checklist of actions that **only the owner / release engineer** can complete.

> Backend remote migrations remain **NOT APPLIED**.

## Immediate (unblock device validation)

1. [ ] Confirm website Supabase project ref is exactly `nhsrdnjfsxfikfbdmdfj` (dashboard only — no keys in chat)
2. [ ] Install Android Studio + SDK Platform Tools per `docs/windows-android-setup-exact.md`
3. [ ] Set `ANDROID_HOME` / `JAVA_HOME` and verify `adb devices` shows Galaxy S25
4. [ ] Enable USB debugging + accept RSA prompt on S25

## Secrets & environments

5. [ ] Keep local `.env` with `EXPO_PUBLIC_ENABLE_DEMO_MODE=false` + local Supabase URL/anon
6. [ ] Add Supabase anon URL/key to EAS Secrets for development / preview / production when ready
7. [ ] Store service role / Mollie **test** key server-side only
8. [ ] Configure push credentials when push flag may be enabled

## Backend (explicit approval required)

9. [ ] Review local SQL under `supabase/migrations/` including RPC migration `20260720101500_*`
10. [ ] Staging apply first; never production without runbook approval
11. [ ] Deploy Edge Functions only after staging verification

## EAS / Android release

12. [ ] `eas login` + `eas init` (confirm correct Expo project — do not link a wrong existing project)
13. [ ] Development build → install on S25 → fill `docs/samsung-s25-device-results.md`
