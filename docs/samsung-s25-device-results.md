# Samsung Galaxy S25 device results

**Date:** 2026-07-20 (Phase 3)  
**Device availability:** **BLOCKED** — `adb` not on PATH, `ANDROID_HOME` unset. Setup guide: `docs/windows-android-setup-exact.md`.

| Check | Result | Notes |
|---|---|---|
| USB debugging / ADB detect | BLOCKED | adb not installed/configured |
| Install development APK | BLOCKED | No Android SDK / no APK built |
| Cold start | BLOCKED | |
| Login (customer.a@local.vdb) | BLOCKED | Local auth proven via API integration only |
| Session restore | BLOCKED | |
| Project flow | BLOCKED | |
| Realtime chat | BLOCKED | |
| Support ticket | BLOCKED | |
| File picker / upload | BLOCKED | |
| Document preview | BLOCKED | |
| Quote acceptance | BLOCKED | |
| Fake / Mollie test checkout | BLOCKED | Mollie key also owner-blocked |
| Browser return | BLOCKED | |
| Notification deep link | BLOCKED | |
| Android back gesture | BLOCKED | |
| Network loss | BLOCKED | |
| App resume | BLOCKED | |
| Logout | BLOCKED | |
| Account deletion request | BLOCKED | |
| Crash-free happy path | BLOCKED | |

## Unblock requirements

1. Complete `docs/windows-android-setup-exact.md`
2. `adb devices` shows S25 as `device`
3. Build + install debug APK
4. Re-run this checklist with PASS/FAIL + logcat excerpts (no secrets)
