# Manual owner actions — Matthijs

## Immediate (device phase) — blocks Phase 6

1. [ ] Confirm website Supabase ref is `nhsrdnjfsxfikfbdmdfj` (no keys in chat)
2. [ ] Install Android Studio + SDK Platform Tools (`docs/windows-android-setup-exact.md`)
3. [ ] Set `ANDROID_HOME` / `JAVA_HOME`; verify `java -version` and `adb version`
4. [ ] Enable USB debugging on Galaxy S25; accept RSA prompt; `adb devices` → `device`
5. [ ] For local Supabase from phone: `adb reverse tcp:54321 tcp:54321` (and any other local ports)

## After SDK works

6. [ ] From clean tree: `npx expo prebuild --clean`
7. [ ] `npx expo run:android` or `cd android; .\gradlew.bat assembleDebug`
8. [ ] Inspect APK → fill `docs/android-apk-evidence.md` + `docs/android-build-evidence.md`
9. [ ] `adb install -r <debug.apk>`; cold start; fill `docs/samsung-s25-device-results.md`
10. [ ] Run Maestro device flows → `docs/maestro-device-results.md`
11. [ ] Optional: `eas login` + `eas init` (correct Expo org/project only) — until then preview AAB is **BLOCKED BY EAS CONFIGURATION**

## Later (production — explicit approval)

12. [ ] Staging migration apply + Edge deploy review
13. [ ] Mollie **test** key server-side only
14. [ ] Push credentials when flag may enable
15. [ ] Play Store internal testing / production signing — never without approval
