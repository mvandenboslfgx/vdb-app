# Pre-staging risk register — VDB Digital Mobile

**Date:** 2026-07-24 (updated after local remediation)
**Repo:** `vdb-app` (`MOBILE_CLIENT`)
**Audit baseline HEAD:** `9105564`
**Architecture:** `SHARED BACKEND FREEZE COMPLETE — STAGING NOT PROVISIONED`
**Remediation evidence:** `docs/local-pre-staging-remediation-evidence.md`
**End status:** `LOCAL PRE-STAGING REMEDIATION PASS — STAGING STILL NOT AUTHORIZED`

Severity: **P0** critical · **P1** high · **P2** medium · **P3** low

---

| ID | Category | Description | Evidence | Severity | Likelihood | Impact | Blocks staging | Blocks standalone APK | Blocks Play Store | Remediation | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-01 | Architecture | No shared staging Supabase project exists | `docs/environment-matrix.md`, contract status | P0 | Certain | Cannot point preview builds at HTTPS backend | **Yes** | **Yes** | **Yes** | Owner provisions staging; Mobile consumes published URL/anon only | Matthijs + CANONICAL_BACKEND_OWNER | Open |
| R-02 | Contract | Shared pin is owner `0.2.0-rc.2` / `2026.07.24.mobile-compat-rc2`; Mobile `0.1.1` demoted to historical proposal | Owner bundle + Mobile consumer pin | P0 | Medium | Staging schema mismatch → runtime failures | **Yes** until staging applies rc.2 | Conditionally | **Yes** | Local convergence done; staging apply still pending | CANONICAL_BACKEND_OWNER | Local convergence — staging apply pending |
| R-03 | Config | EAS preview/production could embed localhost / demo | `eas.json`, `validate-eas-env.mjs`, `env.ts` localhost guard | P0 | Medium | Mis-set secrets embed bad config | **Yes** until EAS secrets | **Yes** | **Yes** | Local gates + safe profile defaults; EAS project/secrets still required | Matthijs + MOBILE_CLIENT | Local mitigated — EAS secrets pending |
| R-04 | Android | Device APK is still a **development client** in practice | `eas.json` preview `developmentClient: false` prepared; no APK built | P0 | Certain | App cannot run offline/standalone today | No | **Yes** | **Yes** | Config ready; needs staging URL + authorized EAS preview build | MOBILE_CLIENT | Config ready — APK not built |
| R-05 | Device QA | Full Maestro **20/20** one clean session never achieved; USB/ADB flaky | `docs/known-limitations.md`, prior suite logs | P1 | High | Incomplete device proof before release | Conditionally | Conditionally | **Yes** | Exclusive host + one uninterrupted suite; then `vdb-mobile-v1-android-device-pass` | MOBILE_CLIENT | Open |
| R-06 | Finance | Mollie checkout / digital goods / partner payouts fail-closed; Edge Functions are stubs | `featureFlags.ts`, contract flags false, `supabase/functions/` | P1 | Certain | Checkout/payouts unavailable until server ready | Conditionally (can stage without live pay) | Conditionally | **Yes** for paid catalog | Owner Edge + test Mollie; keep fail-closed until ready | CANONICAL_BACKEND_OWNER | Open (fail-closed OK) |
| R-07 | Security | Feature-flag key mismatch (legacy `payments.*` / `partner.*` vs contract) | Canonical keys in migrations/seed/RPC/smoke; local seed enables `partner_payouts` for tests only | P1 | Low | Staging may think flags off while DB keys differ | Conditionally | No | Conditionally | Canonicalized locally; owner must keep same keys on staging | MOBILE_CLIENT + owner | Local fixed |
| R-08 | Security | Local test password `LocalTestVdb2026` in Maestro/scripts/docs; DEMO service-role JWT in seed script | `maestro/shared/login.yaml`, `seed-local-identities.mjs` | P1 | Medium | Credential reuse / secret-scan gaps if copied to staging | **Yes** if reused | No | **Yes** | Staging-only secrets outside public repo; rotate after review | Matthijs | Open |
| R-09 | Isolation | Sibling stacks may still compete for host attention | `device-test-harness.mjs` report-only | P1 | Medium | Local false failures; agent chaos | No | No | No | Owner process: stop hostile sibling agents during Mobile QA | Matthijs | Mitigated in Mobile code |
| R-10 | Deep links | Scheme/App Links declared; live router was missing | `DeepLinkHandler` + `deepLinkToHref` group routes; unit tests | P1 | Medium | Auth/checkout returns may not navigate | Conditionally | Conditionally | Conditionally | App wiring done; staging `assetlinks.json` still owner | MOBILE_CLIENT | Local fixed — staging App Links pending |
| R-11 | Storage | No real AV scan provider; `mark_document_scan_clean` is staff/dev path | documents migrations, admin repo | P2 | High | Flagged files / trust model incomplete on staging | Conditionally | Conditionally | Conditionally | Staging marks scan limitation; owner AV adapter later | CANONICAL_BACKEND_OWNER | Open |
| R-12 | Observability | Sentry DSN empty; init no-ops; PII may leak in exception context when enabled | `observability.ts`, `.env` | P2 | Medium | Blind staging / privacy risk | Conditionally | Conditionally | Conditionally | Staging DSN + scrub extras; env separation | Matthijs | Open |
| R-13 | Push | `pushNotifications` false; notifications repository always mock; no token registration | feature flags, notifications repo | P2 | Certain | No remote push on staging until provider | No | No | Conditionally | Expo push + Edge; keep flag off until ready | MOBILE_CLIENT + owner | Open |
| R-14 | UI | Premium pass covers customer dashboard + tab chrome only; most list/form screens still ListRow / old hierarchy | `docs/mobile-ui-audit.md`, screen inventory | P2 | Certain | Inconsistent brand before store screenshots | No | No | Conditionally | Next UI pass across remaining screens | MOBILE_CLIENT | Open |
| R-15 | Tooling | Expo SDK patch/minor mismatches | `npx expo-doctor` after `expo install --fix` → 20/20 | P2 | Low | Build surprises on EAS | Conditionally | Conditionally | Conditionally | Keep `expo install --fix` before EAS | MOBILE_CLIENT | Fixed |
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

**Staging authorization:** still blocked by **R-01** (and owner publish of **R-02**), plus **R-03** EAS secrets and **R-08** credential hygiene. Local contract/flag/EAS-config remediations do **not** authorize staging.
**Standalone APK:** blocked by **R-01** + authorized EAS preview build (**R-03/R-04**).
**Play Store:** blocked by **R-01–R-06, R-18, R-19** plus device proof **R-05**.
