# Manual owner actions — Matthijs

## Done

- [x] Android toolchain + S25 `device`
- [x] Docker + local Supabase + `adb reverse`
- [x] Debug APK install + cold start
- [x] Development diagnostics probes (auth/db/realtime/storage)
- [x] Maestro suite rewritten to real testIDs + `LocalTestVdb2026`
- [x] Auto-discovered suite denominator **20** + health gates
- [x] Open flows 16–21 PASS in one subset session (not full-suite proof)

## Remaining before android-device-pass tag

1. [ ] **Stop all other Cursor agents** that start `vdbdigital2` / remove `vdb-digital-mobile-local` (critical)
2. [ ] One uninterrupted Maestro **20/20** after `npm run device:test:reset`
3. [ ] Accessibility Scanner pass
4. [ ] Re-run full quality gates green (`lint`, `typecheck`, tests, RLS, expo-doctor, …)
5. [ ] Optional EAS project link for preview AAB

## Forbidden without approval

Remote migrations · live Mollie · production push · Git push · Play Store upload
