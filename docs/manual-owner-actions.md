# Manual owner actions — Matthijs

## Immediate blockers (2026-07-21)

1. [ ] Connect S25 USB → `adb devices` shows `R3GYC00EBYY device` (not empty / unauthorized)
2. [ ] Start **Docker Desktop** (engine running) so `npx supabase start` works
3. [ ] `adb reverse tcp:54321 tcp:54321` and `adb reverse tcp:8081 tcp:8081`
4. [ ] Reply in Cursor when both device + Docker are up so install/cold start can resume

## Already done

- [x] Java / `JAVA_HOME` / `ANDROID_HOME` / `adb`
- [x] Node `v24.15.0` / npm `11.12.1`
- [x] Debug APK built + inspected (`docs/android-apk-evidence.md`)
- [x] Prebuild previously run (`android/` gitignored)

## Later (after device install)

5. [ ] Cold start + logcat; fill `docs/samsung-s25-device-results.md`
6. [ ] Maestro device flows → `docs/maestro-device-results.md`
7. [ ] Optional: `eas login` + `eas init` — preview AAB **BLOCKED BY EAS CONFIGURATION** until linked
8. [ ] Production actions only with explicit approval (migrations, Mollie, Play, push)
