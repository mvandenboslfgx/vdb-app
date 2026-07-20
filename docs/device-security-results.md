# Device security results

**Date:** 2026-07-20  
**Status:** **BLOCKED** — no APK / device session to inspect.

| Check | Result |
|---|---|
| Service-role key absent from client | PASS (code review / env design) |
| Mollie live key absent | PASS (fail-closed) |
| Demo not silently active | PASS (adapter contract + tests) |
| Stringscan of APK for secrets | BLOCKED |
| Tokens in logcat | BLOCKED |
| Deep-link validation | REAL BUT DEVICE UNTESTED |
| Diagnostics screen hides secrets | PASS (dev-only host without keys) |
