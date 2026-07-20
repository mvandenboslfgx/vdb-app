# Android build evidence (Phase 6)

**Date:** 2026-07-20  
**Branch:** `feature/vdb-mobile-app-v1`  
**Machine:** Windows 10 — JDK 21 (Android Studio JBR), SDK at `%LOCALAPPDATA%\Android\Sdk`

## Summary

| Item | Status |
|---|---|
| `npx expo prebuild --clean --platform android` | **PASS** |
| `gradlew.bat assembleDebug` (arm64-v8a) | **PASS** (retry after Maven download failure) |
| APK artifact exists | **PASS** |
| SHA-256 recorded | **PASS** |
| Install via `adb` | **PENDING** — device disconnected after build (see device results) |
| Expo Go used as evidence | **No** |

## Prebuild

```powershell
npx expo prebuild --clean --platform android
```

- Generated `./android` (gitignored per project strategy — `/android` in `.gitignore`)
- `package.json` scripts updated by Expo: `android` → `expo run:android`, `ios` → `expo run:ios`
- Warning: `@sentry/react-native/expo` missing organization/project (env fallback) — non-blocking for debug
- Warning: `userInterfaceStyle` suggests `expo-system-ui` — non-blocking

## Gradle

| Field | Value |
|---|---|
| Task | `assembleDebug` |
| Architectures | `arm64-v8a` (S25 physical ABI; limited for faster debug) |
| First attempt | **FAIL** — transient Maven/Google download errors (~21m) |
| Successful attempt | **PASS** — `BUILD SUCCESSFUL in 14m 34s` (wall ~876s including daemon) |
| buildTools | 36.0.0 |
| minSdk | 24 |
| compileSdk | 36 |
| targetSdk | 36 |
| NDK | 27.1.12297006 |
| Kotlin | 2.1.20 |
| Hermes | enabled |
| New Architecture | enabled |

Notable warnings: Kotlin deprecations in Reanimated/Expo modules; SDK XML version 4 vs cmdline-tools note — non-fatal.

## Artifact

| Field | Value |
|---|---|
| Path | `C:\Users\XXX\vdb-app\android\app\build\outputs\apk\debug\app-debug.apk` |
| Size | 81 882 496 bytes (~78.1 MiB) |
| SHA-256 | `0D4C0BFDD85E77335424B63DE14B64D8CEAFBDF621F351206DF7BF5772043C20` |
| Signing | Android Debug (v2) — `CN=Android Debug` |
| Package | `nl.vdbdigital.app` |
| versionName | `1.0.0` |
| versionCode | `1` |

## Native project strategy

`/android` and `/ios` are **gitignored**. Native trees are regenerated via `expo prebuild`. Do not commit random one-off edits under `android/` — persist config in `app.config.ts` / Expo plugins instead.

## Local Supabase route (for later device run)

```powershell
adb reverse tcp:54321 tcp:54321
adb reverse tcp:8081 tcp:8081   # Metro for debug JS
```

`.env`: `EXPO_PUBLIC_APP_ENV=development`, host `127.0.0.1:54321`, `EXPO_PUBLIC_ENABLE_DEMO_MODE=false`.  
Merged debug manifest has `usesCleartextTraffic="true"` (required for HTTP local API).
