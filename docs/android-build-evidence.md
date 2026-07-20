# Android build evidence (Phase 3)

**Date:** 2026-07-20

| Item | Status |
|---|---|
| Local `npx expo run:android` | **BLOCKED** — `ANDROID_HOME` missing (see `docs/windows-android-setup-exact.md`) |
| ADB install to S25 | **BLOCKED** — `adb` missing |
| EAS development build | **BLOCKED BY OWNER CONFIGURATION** — no `EXPO_PUBLIC_EAS_PROJECT_ID` / EAS login in this session |
| Preview APK/AAB | Not built |
| Production AAB | Not built (forbidden without gates + secrets) |
| Artifact path / size / build time | **N/A** — no APK produced |

## Config validated in repo (not from a built artifact)

| Field | Value |
|---|---|
| package | `nl.vdbdigital.app` (`app.config.ts`) |
| version name | `1.0.0` |
| version code | `1` |
| target / compile / min SDK | **Not verified from APK** — requires a real Gradle/EAS build |
| icons | Official mark wired 2026-07-20 |
| demo in preview/production | Hard-fail via `resolveDemoMode` |

Do not claim target SDK numbers without inspecting a built artifact.
