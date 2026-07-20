# Android APK evidence

**Date:** 2026-07-20  
**Status:** **PASS** (artifact inspected) — install/device flows separate.

## Artifact

| Field | Value |
|---|---|
| Path | `android\app\build\outputs\apk\debug\app-debug.apk` (absolute: `C:\Users\XXX\vdb-app\android\app\build\outputs\apk\debug\app-debug.apk`) |
| Size | 81 882 496 bytes |
| SHA-256 | `0D4C0BFDD85E77335424B63DE14B64D8CEAFBDF621F351206DF7BF5772043C20` |
| Signing | Debug — APK Signature Scheme v2; DN `CN=Android Debug, OU=Android, O=Unknown, L=Unknown, ST=Unknown, C=US` |
| Signer SHA-256 | `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` |

## Manifest (from `aapt dump badging` / `apkanalyzer`)

| Field | Evidence |
|---|---|
| package / application-id | `nl.vdbdigital.app` |
| application-label | `VDB Digital` |
| versionName | `1.0.0` |
| versionCode | `1` |
| minSdk (sdkVersion) | **24** |
| targetSdk | **36** |
| compileSdk | **36** (`compileSdkVersion='36'`, `platformBuildVersionCode='36'`) |
| Launch activity | `.MainActivity` (MAIN/LAUNCHER) |
| Deep links | `vdbdigital://` scheme; `https://vdbdigital.nl/app` (autoVerify) |
| Cleartext (merged debug) | `android:usesCleartextTraffic="true"` |
| ABIs packaged | `arm64-v8a` (debug build limited to device ABI) |

## Requested permissions (APK)

### Core / justified

| Permission | Justification |
|---|---|
| `INTERNET` | Supabase / API |
| `ACCESS_NETWORK_STATE` / `ACCESS_WIFI_STATE` | NetInfo |
| `POST_NOTIFICATIONS` | Local/push prefs (delivery fail-closed without credentials) |
| `VIBRATE` | Haptics / notifications |
| `RECEIVE_BOOT_COMPLETED` | Notification scheduling (expo-notifications) |
| `WAKE_LOCK` | Notifications / FCM-related libs |
| `USE_BIOMETRIC` / `USE_FINGERPRINT` | SecureStore biometric unlock path |
| Storage `READ`/`WRITE` maxSdk 32 | Legacy media access ≤ API 32; prefer system picker on modern APIs |

### Needs follow-up trim (still present in debug APK)

| Permission | Source (likely) | Action |
|---|---|---|
| `CAMERA` | expo-image-picker | Keep only if camera capture required; else remove via plugin config |
| `RECORD_AUDIO` | expo-image-picker (video/mic) | Prefer disable microphone permission if unused |
| `SYSTEM_ALERT_WINDOW` | RN / Expo debug overlay path | Remove for release; audit debug necessity |
| Vendor badge permissions (Samsung/Huawei/…) | expo-notifications badging | Acceptable for notifications; document for Play review |

No location / foreground-service permissions observed in badging output.

## Tools used

- `aapt dump badging` / `aapt dump permissions` — Build-Tools 36.0.0
- `apkanalyzer manifest application-id|version-name|version-code` + `apk summary`
- `apksigner verify -v --print-certs`
