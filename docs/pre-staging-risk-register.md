# Pre-staging risk register — VDB Digital Mobile

**Date:** 2026-07-24  
**Repo:** `vdb-app` (`MOBILE_CLIENT`)  
**HEAD:** `b34988e` (`feat: refine premium mobile dashboard and navigation`)  
**Architecture:** `SHARED BACKEND FREEZE COMPLETE — STAGING NOT PROVISIONED`  
**Audit mode:** READ-ONLY (no remediations applied)

Severity: **P0** critical · **P1** high · **P2** medium · **P3** low

---

| ID | Category | Description | Evidence | Severity | Likelihood | Impact | Blocks staging | Blocks standalone APK | Blocks Play Store | Remediation | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-01 | Architecture | No shared staging Supabase project exists | `docs/environment-matrix.md`, contract status `MOBILE_ISOLATION_FREEZE` | P0 | Certain | Cannot point preview builds at HTTPS backend | **Yes** | **Yes** | **Yes** | Owner provisions staging; Mobile consumes published URL/anon only | Matthijs + CANONICAL_BACKEND_OWNER | Open |
| R-02 | Contract | Mobile contract (`0.1.0` / `2026.07.22.freeze`) is thinner than local 19-migration proposal; RPC catalog not pinned; table naming drift (`leads` vs `partner_leads`, `profiles` vs `app_profiles`) | `contracts/backend-contract.json`, `supabase/migrations/*`, `docs/migration-ownership.md` | P0 | High | Staging schema mismatch → runtime failures | **Yes** | Conditionally | **Yes** | Align contract with VDB Digital 2.0; publish bump; Mobile pin + types | CANONICAL_BACKEND_OWNER | Open |
| R-03 | Config | EAS `preview`/`production` set only `EXPO_PUBLIC_APP_ENV`; URL/anon/demo not pinned in `eas.json` | `eas.json`, `app.config.ts` (`EAS_PROJECT_ID` empty) | P0 | High | Mis-set secrets could embed localhost or empty config | **Yes** | **Yes** | **Yes** | `eas init` + secrets matrix; CI gate reject `127.0.0.1` in non-dev builds | Matthijs + MOBILE_CLIENT | Open |
| R-04 | Android | Current device APK is **development client** requiring Metro + USB/`adb reverse` to local `:54521` | `eas.json` development profile; debug cleartext manifests; S25 practice | P0 | Certain | App cannot run offline/standalone today | No | **Yes** | **Yes** | EAS preview APK (non–dev-client) + online staging URL | MOBILE_CLIENT | Open |
| R-05 | Device QA | Full Maestro **20/20** one clean session never achieved; USB/ADB flaky; sibling Docker interference historically | `docs/known-limitations.md`, prior suite logs | P1 | High | Incomplete device proof before release | Conditionally | Conditionally | **Yes** | Exclusive host + one uninterrupted suite; then `vdb-mobile-v1-android-device-pass` | MOBILE_CLIENT | Open |
| R-06 | Finance | Mollie checkout / digital goods / partner payouts fail-closed; Edge Functions are stubs | `featureFlags.ts`, contract flags false, `supabase/functions/` | P1 | Certain | Checkout/payouts unavailable until server ready | Conditionally (can stage without live pay) | Conditionally | **Yes** for paid catalog | Owner Edge + test Mollie; keep fail-closed until ready | CANONICAL_BACKEND_OWNER | Open |
| R-07 | Security | Feature-flag key mismatch: contract `mollie_checkout` vs DB seed `payments.mollie_checkout`; smoke test may give false confidence | `rls_smoke.sql`, migration `20260720101200_*`, contract | P1 | Medium | Staging may think flags off while DB keys differ | **Yes** (before enabling money) | No | **Yes** | Canonicalize flag keys in owner schema + contract + client | CANONICAL_BACKEND_OWNER | Open |
| R-08 | Security | Local test password `LocalTestVdb2026` in Maestro/scripts/docs; DEMO service-role JWT in seed script | `maestro/shared/login.yaml`, `seed-local-identities.mjs` | P1 | Medium | Credential reuse / secret-scan gaps if copied to staging | **Yes** if reused | No | **Yes** | Staging-only secrets outside public repo; rotate after review | Matthijs | Open |
| R-09 | Isolation | Sibling stacks (`vdbdigital2`, `vdb-partners`) may still compete for host attention; Mobile harness correctly report-only but environment remains fragile | `device-test-harness.mjs`, historical docs citing `docker rm` from siblings | P1 | Medium | Local false failures; agent chaos | No | No | No | Owner process: stop hostile sibling agents during Mobile QA | Matthijs | Mitigated in Mobile code |
| R-10 | Deep links | Scheme/App Links declared; parser unit-tested; **no live Linking router** wired in app tree; route name mismatches possible | `linking.ts`, `app.config.ts`, no `useURL` consumer | P1 | High | Auth/checkout returns may not navigate | Conditionally | Conditionally | Conditionally | Wire Expo Router linking; staging `assetlinks.json` | MOBILE_CLIENT | Open |
| R-11 | Storage | No real AV scan provider; `mark_document_scan_clean` is staff/dev path | documents migrations, admin repo | P2 | High | Flagged files / trust model incomplete on staging | Conditionally | Conditionally | Conditionally | Staging marks scan limitation; owner AV adapter later | CANONICAL_BACKEND_OWNER | Open |
| R-12 | Observability | Sentry DSN empty; init no-ops; PII may leak in exception context when enabled | `observability.ts`, `.env` | P2 | Medium | Blind staging / privacy risk | Conditionally | Conditionally | Conditionally | Staging DSN + scrub extras; env separation | Matthijs | Open |
| R-13 | Push | `pushNotifications` false; notifications repository always mock; no token registration | feature flags, notifications repo | P2 | Certain | No remote push on staging until provider | No | No | Conditionally | Expo push + Edge; keep flag off until ready | MOBILE_CLIENT + owner | Open |
| R-14 | UI | Premium pass covers customer dashboard + tab chrome only; most list/form screens still ListRow / old hierarchy | `docs/mobile-ui-audit.md`, screen inventory | P2 | Certain | Inconsistent brand before store screenshots | No | No | Conditionally | Next UI pass across remaining screens | MOBILE_CLIENT | Open |
| R-15 | Tooling | `expo-doctor` fails: Expo SDK patch/minor mismatches (`react-native-screens`, expo_* packages) | `npx expo-doctor` 2026-07-24 | P2 | Medium | Build surprises on EAS | Conditionally | Conditionally | Conditionally | `npx expo install --check` before EAS | MOBILE_CLIENT | Open |
| R-16 | Docs drift | Historical docs still cite `:54321` / old reverse commands | `docs/samsung-s25-device-results.md`, `android-build-evidence.md` | P3 | Medium | Operator misconfig | No | No | No | Mark historical; keep matrix as source of truth | MOBILE_CLIENT | Open |
| R-17 | Git hygiene | Uncommitted Maestro harness/login tweaks remain outside UI commit | `git status`: login.yaml, run-maestro-device.mjs, maestro-suite-manifest | P3 | Low | Noise / incomplete harness checkpoint | No | No | No | Separate commit or discard intentionally | MOBILE_CLIENT | Open |
| R-18 | Finance integrity | Dual four-eyes incomplete; `approved`→`payable` path unclear; Edge stubs TODO | payout/commission SQL + functions README | P1 | Medium | Incorrect payouts if flags enabled early | **Yes** before enabling payouts | No | **Yes** | Owner completes financial RPCs before flag-on | CANONICAL_BACKEND_OWNER | Open |
| R-19 | Play policy | Privacy/account-deletion URLs drafted; live verification, Data Safety, reviewer account, signing not done | `docs/play-store-submission.md`, `docs/store/*` | P1 | Certain | Store rejection | No | No | **Yes** | Legal/owner checklist + live URLs | Matthijs + legal | Open |
| R-20 | Secret scan gaps | Scan skips `android/`; may miss DEMO_SERVICE_ROLE const naming | `scripts/secret-scan.mjs` | P2 | Low | False negative | Conditionally | Conditionally | Conditionally | Extend patterns; keep service role out of client | MOBILE_CLIENT | Open |

---

## Summary counts

| Severity | Count |
|---|---:|
| P0 | 4 |
| P1 | 8 |
| P2 | 6 |
| P3 | 2 |

**Staging authorization:** blocked primarily by **R-01, R-02, R-03** (and R-07/R-08 before any shared credentials).  
**Standalone APK:** blocked by **R-01, R-03, R-04**.  
**Play Store:** blocked by **R-01–R-06, R-18, R-19** plus device proof **R-05**.
