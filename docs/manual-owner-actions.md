# Manual owner actions — Matthijs

## Immediate (device phase) — install blocked on USB

1. [ ] Confirm website Supabase ref is `nhsrdnjfsxfikfbdmdfj` (no keys in chat)
2. [x] Install Android Studio + SDK Platform Tools
3. [x] Set `ANDROID_HOME` / `JAVA_HOME`; verify `java -version` and `adb version`
4. [ ] Reconnect Galaxy S25 USB; unlock; accept RSA if needed; `adb devices` → `device` (`SM_S931B`)
5. [ ] `adb reverse tcp:54321 tcp:54321` and `adb reverse tcp:8081 tcp:8081`
6. [ ] `adb install -r android\app\build\outputs\apk\debug\app-debug.apk` (rebuild if tree cleaned)
7. [ ] Start Metro (`npx expo start`); cold start; fill `docs/samsung-s25-device-results.md`
8. [ ] Run Maestro device flows → `docs/maestro-device-results.md`
9. [ ] Optional: `eas login` + `eas init` — preview AAB **BLOCKED BY EAS CONFIGURATION** until linked

## Done this session

- Debug APK built + inspected (`docs/android-build-evidence.md`, `docs/android-apk-evidence.md`)

## Later (production — explicit approval)

12. [ ] Staging migration apply + Edge deploy review
13. [ ] Mollie **test** key server-side only
14. [ ] Push credentials when flag may enable
15. [ ] Play Store internal testing / production signing — never without approval
