# Samsung Galaxy S25 device results (Phase 6 — full validation attempt)

**Date:** 2026-07-21  
**Device:** `R3GYC00EBYY` / `SM_S931B` / `arm64-v8a`  
**Package:** `nl.vdbdigital.app` 1.0.0 (1)  
**Connectivity:** `adb reverse` tcp:54321 + tcp:8081 → local Supabase + Metro  
**End status:** **SAMSUNG S25 DEVICE PASS WITH LIMITATIONS — PRODUCTION NOT ACTIVATED**  
**Tag `vdb-mobile-v1-android-device-pass`:** **NOT created** (Maestro device 0/20 PASS; partner/admin deep flows incomplete)

## Environment re-check

| Check | Result |
|---|---|
| `adb devices` | PASS — `device` |
| `adb reverse --list` | PASS — 54321, 8081 |
| Supabase auth/REST | PASS — HTTP 200 |
| App PID after cold start | PASS — process alive |
| Metro | PASS — bundle loaded earlier |

## Development diagnostics (physical S25)

Opened via Meer → Development diagnostics (`nav-dev-diagnostics` / `screen-dev-diagnostics`).

| Probe | Result |
|---|---|
| App-omgeving | `development` |
| Repository-adapter | `supabase` |
| Demo-adapter actief | `false` |
| Supabase-host | `http://127.0.0.1:54321` (no keys) |
| Auth | `[ok] session present` |
| Database | `[ok] feature_flags readable` |
| Realtime | `[ok] ok` |
| Storage | `[ok] ok` |
| Pushbezorging | `fail-closed` |
| Checkoutprovider | `fail-closed` |
| Secrets on screen | **PASS** — UI secret scan `NO_SECRETS_IN_UI` |
| Edge Functions probe | **N/A** — not on diagnostics screen; local edge_runtime was stopped in `supabase start` output |

## Cold start + logcat (this session)

| Check | Result |
|---|---|
| `logcat -c` + force-stop + start | PASS |
| FATAL / AndroidRuntime E for app | none observed |
| First UI | Login / public home / dashboard depending on session |

## Auth (physical)

| Check | Result | Notes |
|---|---|---|
| Login customer.a (seed) | PASS (earlier in session) | Dashboard `Hallo Customer A` |
| Wrong password | PASS | UI `E-mail of wachtwoord is onjuist` / `login-error` |
| Logout | PASS | After logout, restart shows login/public |
| Re-login / session restore | PARTIAL | Adb password `!` / `@` escaping flaky across runs |
| Register new account | PENDING | Not executed this pass |
| Password-reset deep link | PENDING | Forgot-password UI seen earlier; full deep link not proven |
| Secure route without session | PARTIAL | Post-logout lands on public/login |

## Customer flows (physical smoke)

| Flow | Result |
|---|---|
| Dashboard | PASS (`screen-customer-dashboard`) |
| Project list/detail | PASS (`screen-project-detail`, seeded project) |
| Status/mijlpalen visible | PASS (Intake / seed copy) |
| Messages tab + chat open | PASS |
| Support screen | PARTIAL |
| Documents list | PASS |
| Quotes list + detail | PASS |
| Invoices list | PASS |
| Document upload / scan / signed URL / approve | PENDING |
| Quote accept + double-submit | PENDING |
| Fake checkout + browser return | PENDING |
| Appointments book/move/cancel | PENDING |
| Notification prefs | PENDING |
| Account deletion request | PENDING |
| Realtime second session | PENDING |

## Partner / admin flows

| Flow | Result |
|---|---|
| Partner / admin full primary suite | PENDING / BLOCKED by flaky adb login automation in later pass |
| Isolation partner A vs B | PENDING |

## Android behaviour

| Check | Result |
|---|---|
| Back gesture (no crash) | PASS — process survived |
| App resume after Home | PARTIAL — depends on session/login state |
| File picker / browser return / network toggle / large text / dark mode / notification deeplink | PENDING |

## Production actions

Remote migrations · live Mollie · production push · Git push · Play upload: **not performed**.
