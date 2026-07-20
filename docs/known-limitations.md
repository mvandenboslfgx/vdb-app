# Known Limitations

> Remote migrations **NOT APPLIED** to `nhsrdnjfsxfikfbdmdfj`.

| Area | Limitation |
|---|---|
| Android SDK / JDK / adb | **PASS** (`docs/android-environment-verification.md`) |
| Debug APK / Gradle | **PASS** — artifact + SHA-256 (`docs/android-build-evidence.md`, `docs/android-apk-evidence.md`) |
| Samsung S25 install & flows | **BLOCKED** — USB disconnect after build; reconnect required (`docs/samsung-s25-device-results.md`) |
| APK permissions trim | **PARTIAL** — CAMERA/RECORD_AUDIO/SYSTEM_ALERT_WINDOW + vendor badges documented for next prebuild |
| Maestro device | Syntax 20/20; device execution **BLOCKED** |
| Device performance / a11y scanner | **BLOCKED** |
| Preview AAB / EAS | **BLOCKED BY EAS CONFIGURATION** — project not linked |
| Mollie live | Fail-closed without owner test key |
| Push delivery | Prefs UI only; external delivery BLOCKED |
| Partner payouts | Local seed enables flag for tests; production flag stays off |
| Official backend | OWNER CONFIRMATION REQUIRED for ref `nhsrdnjfsxfikfbdmdfj` |
| Dev diagnostics screen | Available only when `APP_ENV=development` (More → Development diagnostics) |
