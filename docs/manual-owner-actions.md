# Manual owner actions — Matthijs

## Done

- [x] Android toolchain + S25 `device`
- [x] Docker + local Supabase + `adb reverse`
- [x] Debug APK install + cold start
- [x] Development diagnostics probes (auth/db/realtime/storage)
- [x] Customer smoke navigation
- [x] Maestro CLI installed; 20 flows executed on device (0 PASS — flows need rewrite)

## Remaining before android-device-pass tag

1. [ ] Rewrite Maestro flows to real NL testIDs + logged-out start + seed logins
2. [ ] Complete partner + admin primary flows on S25 (manual or fixed Maestro)
3. [ ] Document upload, quote accept, checkout return, appointments
4. [ ] Accessibility Scanner pass
5. [ ] Re-run full quality gates green (`lint`, `typecheck`, tests, RLS, …)
6. [ ] Optional EAS project link for preview AAB

## Forbidden without approval

Remote migrations · live Mollie · production push · Git push · Play Store upload
