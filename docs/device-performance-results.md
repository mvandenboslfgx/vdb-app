# Device performance results

**Date:** 2026-07-21  
**Device:** Samsung Galaxy S25 (`SM_S931B`)

| Metric | Result |
|---|---|
| Cold start to interactive UI | PASS (qualitative) — splash then login/dashboard; no hang observed |
| Metro first bundle (empty cache) | ~70.7s (dev only; not release) |
| Warm start / resume | PARTIAL — process survives; UI depends on session |
| Dashboard load (seeded) | PASS — cards/projects visible after login |
| Chat open | PASS (smoke) |
| Document list | PASS (smoke) |
| Memory warnings / jank instrumentation | PENDING — no systrace/perfetto capture |
| Duplicate realtime subscriptions | PENDING — not instrumented on device |

No crash loops observed during smoke navigation.
