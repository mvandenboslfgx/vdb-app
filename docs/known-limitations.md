# Known Limitations

> Remote migrations **NOT APPLIED** to `nhsrdnjfsxfikfbdmdfj`.

| Area | Limitation |
|---|---|
| Android toolchain + S25 USB | **PASS** |
| Debug APK install + cold start | **PASS** when Metro + stack healthy |
| Suite denominator | **20** auto-discovered (`docs/maestro-suite-manifest.md`); gap at flow number 18 |
| Open flows 16–21 (subset after reset) | **5/5 PASS** (2026-07-21) — not full-suite proof |
| Maestro full suite one clean session | **NOT PASS** — blocked by competing Supabase stacks / hostile watchdog |
| Local Docker | **FLAKY** — `vdbdigital2` port conflict; parallel agent may `docker rm` mobile-local |
| Font load without Metro | Soft-fail (system fonts); previously hard redbox |
| Accessibility Scanner | **PENDING** |
| Preview AAB / EAS | **BLOCKED BY EAS CONFIGURATION** |
| Mollie live / production push | Fail-closed / not activated |

**Tag `vdb-mobile-v1-android-device-pass` not created** (requires Maestro **20/20** in one clean run + full gates).
