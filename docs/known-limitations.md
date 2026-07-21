# Known Limitations

> Remote migrations **NOT APPLIED** to `nhsrdnjfsxfikfbdmdfj`.

| Area | Limitation |
|---|---|
| Android SDK / JDK / adb | **PASS** (`docs/android-environment-verification.md`) |
| Debug APK / Gradle | **PASS** — artifact + SHA-256 (`docs/android-build-evidence.md`, `docs/android-apk-evidence.md`) |
| Samsung S25 install & cold start | **PASS** — `nl.vdbdigital.app` installed; login UI; no fatal crash |
| Manual primary flows on S25 | **PENDING** |
| APK permissions trim | **PARTIAL** — CAMERA/RECORD_AUDIO/SYSTEM_ALERT_WINDOW + vendor badges for next prebuild |
| Maestro device | Syntax 20/20; device execution **PENDING** |
| Device performance / a11y scanner | **PENDING** |
| Preview AAB / EAS | **BLOCKED BY EAS CONFIGURATION** — project not linked |
| Mollie live | Fail-closed without owner test key |
| Push delivery | Prefs UI only; external delivery BLOCKED |
| Partner payouts | Local seed enables flag for tests; production flag stays off |
| Official backend | OWNER CONFIRMATION REQUIRED for ref `nhsrdnjfsxfikfbdmdfj` |
| Dev diagnostics screen | Available only when `APP_ENV=development` (More → Development diagnostics) |
