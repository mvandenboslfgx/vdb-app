# Known Limitations

> Remote migrations **NOT APPLIED** to `nhsrdnjfsxfikfbdmdfj`.

| Area | Limitation |
|---|---|
| Android toolchain + S25 USB | **PASS** |
| Debug APK install + cold start | **PASS** |
| Device diagnostics (auth/db/realtime/storage) | **PASS** when local stack healthy |
| Customer / partner / admin Maestro smoke (01–12) | **PASS** on S25 suite 2026-07-21 |
| Maestro device full suite | **12/20 PASS** — not 20/20 (`docs/maestro-device-results.md`) |
| Flows 13–21 | **OPEN** — appointments scroll fix pending re-run; suite blocked after 13 |
| Local Docker | **FLAKY** — `vdbdigital2` port conflict; `supabase_db_*` can exit mid-suite |
| Accessibility Scanner | **PENDING** |
| Preview AAB / EAS | **BLOCKED BY EAS CONFIGURATION** |
| Mollie live / production push | Fail-closed / not activated |

**Tag `vdb-mobile-v1-android-device-pass` not created** (requires Maestro 20/20 + full gates).
