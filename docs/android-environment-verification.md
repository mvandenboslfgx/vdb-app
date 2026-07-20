# Android environment verification

**Date:** 2026-07-20 (Phase 6 resume)  
**Machine:** Windows 10 (`win32 10.0.19045`)  
**Branch:** `feature/vdb-mobile-app-v1`

## Commands run

```powershell
java -version
echo $env:JAVA_HOME
echo $env:ANDROID_HOME
adb version
adb devices -l
Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe"
```

## Results

| Component | Result | Evidence |
|---|---|---|
| JDK / `java` on PATH | **PASS** | OpenJDK 21.0.10 (`Android Studio jbr`) |
| `JAVA_HOME` | **PASS** | `C:\Program Files\Android\Android Studio\jbr` |
| Android Studio install | **PASS** | JBR present under Program Files\Android\Android Studio |
| `ANDROID_HOME` | **PASS** | `C:\Users\XXX\AppData\Local\Android\Sdk` |
| `ANDROID_SDK_ROOT` | **PASS** (optional unset) | empty; `ANDROID_HOME` used exclusively |
| Platform Tools / `adb` | **PASS** | adb 1.0.41 / 37.0.0-14910828 at `%ANDROID_HOME%\platform-tools\adb.exe` |
| Build Tools | **PASS** | `36.0.0` |
| Platforms | **PASS** | `android-36`, `android-36.1` |
| Command-line Tools / `sdkmanager` | **PASS** | `cmdline-tools\latest` |
| Single `adb` on PATH | **PASS** | only `%ANDROID_HOME%\platform-tools\adb.exe` |
| Conflicting SDK installs | **PASS** | one SDK at `ANDROID_HOME`; no alternate used |
| Samsung S25 via USB | **PASS** | serial `R3GYC00EBYY`, model `SM_S931B`, product `pa1qxeea` |
| Device status `device` | **PASS** | `adb devices -l` → `device` (not unauthorized/offline) |

## Device connectivity route (local Supabase)

Preferred for physical device:

```powershell
adb reverse tcp:54321 tcp:54321
```

App `.env` uses `EXPO_PUBLIC_SUPABASE_URL` host `127.0.0.1:54321` with `EXPO_PUBLIC_ENABLE_DEMO_MODE=false` and `EXPO_PUBLIC_APP_ENV=development`. After reverse, phone localhost maps to the PC local Supabase API.

## Verdict

**Android toolchain ready.** Samsung Galaxy S25 visible. Proceed with Expo prebuild + debug APK.
