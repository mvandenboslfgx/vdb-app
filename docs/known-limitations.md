# Known Limitations

> Remote migrations **NOT APPLIED** to `nhsrdnjfsxfikfbdmdfj`.

| Area | Limitation |
|---|---|
| Android toolchain + S25 USB | **PASS** |
| Debug APK install + cold start | **PASS** |
| Device diagnostics (auth/db/realtime/storage) | **PASS** (Edge Functions probe N/A on screen) |
| Customer smoke (dashboard/projects/chat/docs/quotes/invoices) | **PASS** |
| Auth wrong-password + logout | **PASS** |
| Partner/admin deep flows | **PENDING** — adb credential automation flaky (`!` / `@`) |
| Maestro device | **FAIL 0/20** — flows executed; testIDs/start-state mismatch (`docs/maestro-device-results.md`) |
| Checkout browser return / appointments / upload / dual-session chat | **PENDING** |
| Accessibility Scanner | **PENDING** |
| Preview AAB / EAS | **BLOCKED BY EAS CONFIGURATION** |
| Typecheck | Watch: Expo Router typed routes noise may appear after prebuild; `usesCleartextTraffic` removed from `app.config.ts` (debug cleartext still via RN merge) |
| Mollie live / production push | Fail-closed / not activated |

**Tag `vdb-mobile-v1-android-device-pass` not created.**
