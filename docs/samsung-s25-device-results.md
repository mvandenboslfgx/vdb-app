# Samsung Galaxy S25 device results (Phase 6)

**Date:** 2026-07-20  
**Status:** **BLOCKED** — `adb` unavailable; no APK installed.

| Check | Result | Notes |
|---|---|---|
| `adb devices` shows S25 | BLOCKED | Android SDK missing |
| APK install | BLOCKED | |
| Cold start | BLOCKED | |
| Auth register/login/session | BLOCKED | |
| Customer flows | BLOCKED | |
| Partner flows | BLOCKED | |
| Admin flows | BLOCKED | |
| Document upload/picker | BLOCKED | |
| Chat realtime | BLOCKED | |
| Checkout browser return | BLOCKED | |
| Appointments | BLOCKED | |
| Notifications deep link | BLOCKED | |
| Account deletion request | BLOCKED | |
| Back gesture / keyboard / offline | BLOCKED | |

## Device connectivity note (when SDK arrives)

On a physical phone, `127.0.0.1` is the phone itself. Prefer:

```powershell
adb reverse tcp:54321 tcp:54321
```

Point the app at `http://127.0.0.1:54321` only after reverse is active, or use the PC LAN IP / staging.

See also: `docs/windows-android-setup-exact.md`, `docs/android-environment-verification.md`.
