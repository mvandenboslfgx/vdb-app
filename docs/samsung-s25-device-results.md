# Samsung Galaxy S25 device results (Phase 6)

**Date:** 2026-07-20  
**Device previously seen:** serial `R3GYC00EBYY`, model `SM_S931B` (Galaxy S25), status `device`

## Current status

| Check | Result | Notes |
|---|---|---|
| Toolchain (JDK/SDK/adb) | PASS | See `android-environment-verification.md` |
| Device visible during env check | PASS | `SM_S931B` / `device` |
| Debug APK built + inspected | PASS | See `android-apk-evidence.md` |
| `adb install` after build | **BLOCKED** | `adb devices` empty after Gradle (~15 min); USB disconnect |
| Cold start / crash check | **BLOCKED** | no install |
| Auth / customer / partner / admin flows | **BLOCKED** | no install |
| Maestro device | **BLOCKED** | no install |

## Connectivity plan (when device returns)

```powershell
adb devices -l
# expect: R3GYC00EBYY ... device model:SM_S931B

adb reverse tcp:54321 tcp:54321
adb reverse tcp:8081 tcp:8081

adb install -r C:\Users\XXX\vdb-app\android\app\build\outputs\apk\debug\app-debug.apk
adb shell pm list packages | findstr vdbdigital
# expect: package:nl.vdbdigital.app

# Debug APK loads JS from Metro — start bundler, then launch:
# npx expo start
adb shell am start -n nl.vdbdigital.app/.MainActivity
```

Route: **adb reverse** → phone `127.0.0.1:54321` → PC local Supabase (already verified HTTP 200 on PC). Demo mode off.

## Not claimed

No PASS for install, cold start, or primary device flows until the steps above succeed with log evidence.
