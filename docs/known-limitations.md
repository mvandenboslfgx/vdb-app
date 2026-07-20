# Known Limitations

> Remote migrations **NOT APPLIED** to `nhsrdnjfsxfikfbdmdfj`.

| Area | Limitation |
|---|---|
| Android SDK / JDK / adb | **FAIL** — environment incomplete (`docs/android-environment-verification.md`) |
| Debug APK / Gradle | **BLOCKED** — no toolchain (`docs/android-build-evidence.md`) |
| Samsung S25 install & flows | **BLOCKED** (`docs/samsung-s25-device-results.md`) |
| Maestro device | Syntax 20/20; device execution **BLOCKED** |
| Device performance / a11y scanner | **BLOCKED** |
| Preview AAB / EAS | **BLOCKED BY EAS CONFIGURATION** — project not linked |
| Mollie live | Fail-closed without owner test key |
| Push delivery | Prefs UI only; external delivery BLOCKED |
| Partner payouts | Local seed enables flag for tests; production flag stays off |
| Official backend | OWNER CONFIRMATION REQUIRED for ref `nhsrdnjfsxfikfbdmdfj` |
| Dev diagnostics screen | Available only when `APP_ENV=development` (More → Development diagnostics) |
