# Staging role matrix — RC4 Mobile Phase 1

```text
Staging: qzekuvmgfekzsowdecyk
Mode: API-level (no APK / no device claim)
Harness: scripts/rc4-staging-partial-matrix.mjs
Results: staging-role-matrix-results.json
Verdict: RC4 MOBILE PHASE 1 PASS — OWNER DETAIL SURFACES STILL REQUIRED — NO BUILD
```

## Counts (latest run)

| Result  | Count |
| ------- | ----: |
| PASS    |    91 |
| BLOCKED |    56 |
| FAIL    |     0 |

## Roles exercised

| Role                           | Status                                               |
| ------------------------------ | ---------------------------------------------------- |
| anon                           | PASS (admin deny)                                    |
| customer                       | PASS (admin deny + login)                            |
| partner_pending                | PASS (admin deny)                                    |
| partner_active                 | PASS (admin deny)                                    |
| partner_suspended              | **BLOCKED** — no vault credential                    |
| staff                          | PASS (reads OK; sensitive mutations denied)          |
| admin AAL1                     | PASS (reads OK; AAL2_REQUIRED on suspend/commission) |
| admin AAL2 success             | **BLOCKED** — no automated TOTP in harness           |
| owner AAL1 / AAL2              | same pattern as admin                                |
| customer_a → customer_b switch | PASS (project isolation)                             |

## Surfaces (summary)

- Admin Home / Goedkeuringen / Directory lists: staffish PASS; others deny PASS
- Directory **details**: all **BLOCKED** (Owner RPC missing) — not marked PASS
- Partner lifecycle / commissions: AAL1 deny PASS; AAL2 success BLOCKED in harness
- Tickets list PASS; internal notes **FEATURE_DISABLED** PASS (flag closed)
- Logout + account switch + QueryClient clear: PASS
- WhatsApp / 5 tabs / S6 dependency: recorded

## Explicit non-PASS

Directory detail RPCs · live AAL2 TOTP success · suspended partner vault · device/APK · S6 partner type model
