# Maestro root-cause audit (recovery pass)

**Date:** 2026-07-21  
**Denominator:** **20** auto-discovered (`docs/maestro-suite-manifest.md`)  
**Open subset (16→21):** **5/5 PASS** after clean reset  
**Full suite one session:** **0/20** — infrastructure cut mid-login (`unexpected end of stream` on `:54321`)  
**Tag:** not created

## Ranked root causes

1. **ENVIRONMENT / HOSTILE** — Parallel Cursor agent in `vdbdigital2.0` force-removes `*vdb-digital-mobile-local*` containers and starts `vdbdigital2` on the same ports (see `docs/local-supabase-stability.md` §6).
2. **ENVIRONMENT** — Competing stacks + ~7.7 GiB Docker RAM → OOM / missing containers mid-health-check.
3. **ENVIRONMENT** — Metro down → font `downloadAsync` redbox (soft-fail now in `app/_layout.tsx`).
4. **HARNESS** — Windows `spawnSync(..., shell:true)` mangled `docker --format {{.Names}}` (fixed: shell false for docker/adb).
5. **SUITE COUNT** — Confusion between prefixes 16–21 and flow count; discovery now enforces **20/20**.

## Open flows (fixed under stable stack)

| Flow | Class | Outcome |
|---|---|---|
| 16 checkout / invoice detail | ENV + start state | PASS (subset) |
| 17 document upload | start state | PASS (subset) |
| 19 partner payout | fixtures | PASS (subset) |
| 20 admin ticket | auth/nav | PASS (subset) |
| 21 admin finance | fixtures | PASS (subset) |

## Full-suite failure signature

`auth-error-message`: wrong password **and** Logbox `fetch failed: unexpected end of stream on http://127.0.0.1:54321` → API died mid-request (stack swap), not an app password bug when verify-local-passwords is green.
