# Samsung Galaxy S25 device results

**Date:** 2026-07-20  
**Device availability:** **BLOCKED** — `adb` not on PATH, `ANDROID_HOME` unset on this machine.

| Check | Result | Notes |
|---|---|---|
| USB debugging / ADB detect | BLOCKED | adb not installed/configured |
| Install development APK | BLOCKED | No Android SDK / no APK built |
| Cold start | BLOCKED | |
| Warm start | BLOCKED | |
| Login | BLOCKED | |
| Session restore | BLOCKED | |
| Keyboard | BLOCKED | |
| Edge-to-edge | BLOCKED | |
| Back gesture | BLOCKED | |
| Deep links | BLOCKED | |
| File picker / upload | BLOCKED | |
| Document preview | BLOCKED | |
| Mollie test checkout return | BLOCKED | Mollie test key also owner-blocked |
| Notification permission | BLOCKED | |
| Notification deep link | BLOCKED | |
| Network loss | BLOCKED | |
| App resume | BLOCKED | |
| Lock screen | BLOCKED | |
| Font scaling | BLOCKED | |
| Dark mode | BLOCKED | |
| Battery optimization | BLOCKED | |
| Crash-free happy path | BLOCKED | |

## Unblock requirements (owner / workstation)

1. Install Android Studio SDK + platform-tools (`adb`)
2. Set `ANDROID_HOME`
3. Enable USB debugging on Galaxy S25
4. Build `eas build --profile development` or `npx expo run:android`
5. Re-run this checklist and replace BLOCKED with PASS/FAIL evidence
