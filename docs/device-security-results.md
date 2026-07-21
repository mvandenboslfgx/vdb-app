# Device security results

**Date:** 2026-07-21

| Check | Result | Evidence |
|---|---|---|
| Service-role key absent from APK text assets | PASS | Unpacked APK scan for `service_role` / `sb_secret_` / `sk_live_` → 0 hits in small text assets |
| Mollie live key absent | PASS | Same scan; checkout fail-closed on device diagnostics |
| Demo not active | PASS | Diagnostics: Demo-adapter `false`; adapter `supabase` |
| Diagnostics hides secrets | PASS | Host only; UI scan no JWT/`eyJ` |
| Tokens in logcat (sample) | PASS / watch | Spot check for `eyJhbGci` / `service_role` / password strings — no hits in sampled window |
| Push / checkout financial fail-closed | PASS | Diagnostics both `fail-closed` |
| Diagnostics gated to development | PASS | Code + screen only via More when `APP_ENV=development` |
| Unauthorized deep-link ID validation | PENDING | Not re-proven this session |
| Private storage not public | PENDING | Storage probe reachable; object ACL not re-audited on device |

No critical secret leakage found in this session’s scans.
