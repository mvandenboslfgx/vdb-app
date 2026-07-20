# VDB Digital Mobile — Implementation Reality Audit

**Branch:** `feature/vdb-mobile-app-v1`  
**Audited:** 2026-07-20 (Phase 3 — local data integration)  
**Runtime target:** local Supabase only (`EXPO_PUBLIC_ENABLE_DEMO_MODE=false` + local URL/anon key)

### Cross-cutting status

| Area | Status |
|---|---|
| Explicit `demo` \| `supabase` adapter | **DONE** — no silent mock fallback on missing client / network / DB errors |
| Typed DB client | **DONE** — `src/types/database.generated.ts` + `db:types` / `db:types:check` |
| Local test identities | **DONE** — `npm run db:seed:identities` (see `docs/local-test-identities.md`) |
| Multi-user RLS suite | **DONE** — `npm run test:rls` → 39/39 PASS |
| Repository integration (API) | **DONE** — `npm run test:repo-integration` |
| Remote production migrations | **NOT APPLIED** — owner confirmation required |
| Android / Samsung S25 | **BLOCKED** — no SDK/`adb` (see `docs/windows-android-setup-exact.md`) |
| Mollie live / test key | **FAIL-CLOSED** — `FEATURE_NOT_CONFIGURED` without server secrets |
| Maestro device execution | **BLOCKED** — syntax validated (`test:maestro:syntax`) |

---

## Summary table

| Feature | Status |
|---|---|
| authentication | REAL BUT UNTESTED ON DEVICE |
| profile (`app_profiles`) | REAL AND TESTED (RLS + seed) |
| role routing | REAL AND TESTED (RLS) |
| projects | REAL AND TESTED (RLS + repo integration) |
| milestones / updates | REAL BUT UNTESTED ON DEVICE |
| chat | REAL AND TESTED (RLS + idempotent send) |
| support | REAL AND TESTED (RLS + create) |
| documents / storage signed URL | PARTIAL — metadata RLS tested; full scan/signed-URL UI E2E pending device |
| quotes / acceptance | REAL AND TESTED (RLS list/isolation); acceptance UI E2E pending device |
| invoices | REAL AND TESTED (RLS) |
| checkout | STUB / FAIL-CLOSED without Mollie |
| partner / commissions | REAL AND TESTED (RLS isolation) |
| payouts | BLOCKED BY OWNER CONFIGURATION |
| appointments | PARTIAL — domain engine + repo wired; concurrency E2E pending |
| account deletion | REAL AND TESTED (request insert) |
| mobile admin RPCs | PARTIAL — queue/stats RPC may still be incomplete |
| push notifications | STUB |
| Maestro flows | SYNTAX READY — device BLOCKED |
| Android APK | BLOCKED |

### Counts (honest)

| Status | Count |
|---|---|
| REAL AND TESTED (local DB/API) | **10** |
| REAL BUT UNTESTED ON DEVICE | **4** |
| PARTIAL | **4** |
| STUB / FAIL-CLOSED | **3** |
| BLOCKED | **3** |

---

## Repository wiring

| Repository | Supabase adapter | Demo adapter | Test status | Open limits |
|---|---|---|---|---|
| projects | yes | yes (explicit flag) | RLS + integration | UI refresh/pagination polish |
| messages | yes | yes | RLS + integration | realtime reconnect UI evidence pending device |
| support | yes | yes | RLS + integration | attachments on device |
| documents | yes | yes | RLS | signed URL / scan adapter E2E |
| quotes | yes | yes | RLS + list | acceptance evidence record UI |
| invoices | yes | yes | RLS | PDF open on device |
| payments | yes (fail-closed) | yes | unit domain | Mollie owner key |
| partners / commissions | yes | yes | RLS | payout flag |
| appointments | yes | yes | unit domain | slot race E2E |
| admin | yes | yes | partial | some RPCs |
| account | yes | yes | integration request | irreversible delete not run |
| auth (AuthProvider) | Supabase Auth | demo enterDemoAs | login integration | full restart/session suite on device |

---

## Quality gates (latest local)

| Gate | Result |
|---|---|
| lint | 0 warnings |
| typecheck | PASS |
| unit tests | 11 suites / 51 tests PASS |
| translations | PASS |
| secret-scan | PASS |
| RLS multi-user | 39/39 PASS |
| repo integration | see latest `test:repo-integration` |
| Maestro syntax | 12/12 PASS |
| Maestro device | BLOCKED |
| Android build | BLOCKED |

Remote backend ref `nhsrdnjfsxfikfbdmdfj` remains **PROBABLE BUT OWNER CONFIRMATION REQUIRED** for production apply — see `docs/official-backend-verification.md`.
