# Manual owner actions — Matthijs

## Immediate (device phase)

1. [ ] Confirm website Supabase ref is `nhsrdnjfsxfikfbdmdfj` (no keys in chat)
2. [ ] Install Android Studio + SDK Platform Tools (`docs/windows-android-setup-exact.md`)
3. [ ] Set `ANDROID_HOME` / `JAVA_HOME`; verify `adb version`
4. [ ] Enable USB debugging on Galaxy S25; accept RSA prompt; `adb devices` → `device`

## After SDK works

5. [ ] From repo: `npx expo prebuild --clean` then `npx expo run:android` or `android\gradlew.bat assembleDebug`
6. [ ] `adb install -r <debug.apk>` and fill `docs/samsung-s25-device-results.md`
7. [ ] Optional: `eas login` + `eas init` (correct Expo project only)

## Later (production — explicit approval)

8. [ ] Staging migration apply + Edge deploy review
9. [ ] Mollie **test** key server-side only
10. [ ] Push credentials when flag may enable
