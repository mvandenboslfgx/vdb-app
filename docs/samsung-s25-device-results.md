# Samsung Galaxy S25 device results (Phase 6)

**Date:** 2026-07-21  
**Device:** serial `R3GYC00EBYY`, model `SM_S931B`, ABI `arm64-v8a`

## Install + cold start

| Check | Result | Notes |
|---|---|---|
| `adb install -r` debug APK | **PASS** | Streamed Install Success |
| Package present | **PASS** | `package:nl.vdbdigital.app` |
| versionName / versionCode | **PASS** | `1.0.0` / `1` |
| minSdk / targetSdk (device) | **PASS** | 24 / 36 |
| `adb reverse` 54321 + 8081 | **PASS** | UsbFfs listed |
| Local Supabase auth/REST | **PASS** | HTTP 200 (PC; reverse to device) |
| Metro bundler | **PASS** | Bundled entry.js ~70.7s (3404 modules) |
| Cold start (`am start` MainActivity) | **PASS** | PID alive; `topResumedActivity` = MainActivity |
| Splash → first UI | **PASS** | UI dump shows `Inloggen` (login) |
| Immediate native crash | **PASS** | no `FATAL EXCEPTION` / `AndroidRuntime` E for app |
| React Native boot | **PASS** | `Running "main"` fabric=true; Sentry disabled (no DSN) |
| Expo Go used | **No** | |

## Cleaned log fragments (no tokens/PII)

```
ReactNativeJS: Running "main" with {"rootTag":1,"initialProps":{},"fabric":true}
ReactNativeJS: [observability] Sentry disabled (no DSN)
ReactNative: [GESTURE HANDLER] Initialize gesture handler ...
Metro: Android Bundled 70657ms node_modules\expo-router\entry.js (3404 modules)
```

Non-fatal noise ignored: Samsung `libpenguin.so` / MinkIPC (system), not app crash.

## Not yet executed (remain PENDING / BLOCKED for pass-tag)

| Area | Status |
|---|---|
| Auth register/login/session restore | PENDING |
| Customer / partner / admin primary flows | PENDING |
| Diagnostics screen probes on device | PENDING |
| Maestro device flows (20) | PENDING |
| Performance / a11y scanner | PENDING |
| Full quality-gate re-run after device work | PENDING |

Do **not** create `vdb-mobile-v1-android-device-pass` until pending items above pass.
