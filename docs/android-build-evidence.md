# Android build evidence (Phase 6)

**Date:** 2026-07-20  
**Status:** **BLOCKED** — Android environment incomplete (`docs/android-environment-verification.md`)

| Item | Status |
|---|---|
| `npx expo prebuild --clean` | **BLOCKED** — no JDK/SDK |
| `npx expo run:android` | **BLOCKED** |
| `gradlew.bat assembleDebug` | **BLOCKED** |
| APK artifact | **N/A** — none produced |
| SHA-256 / size / build duration | **N/A** |
| Install via `adb` | **BLOCKED** |
| Expo Go used as evidence | **No** (correctly not claimed) |

## Intended package (from `app.config.ts`, not from APK)

| Field | Config value |
|---|---|
| package | `nl.vdbdigital.app` |
| name | `VDB Digital` |
| versionName | `1.0.0` |
| versionCode | `1` |
| min/target/compile SDK | **Not verified** — requires Gradle/APK |

Do not treat config values as APK inspection evidence.
