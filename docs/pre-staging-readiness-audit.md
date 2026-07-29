# Pre-staging & standalone readiness audit — VDB Digital Mobile

**Date:** 2026-07-24  
**Mode:** AUDIT ONLY — no remote actions, no EAS build, no Git push, no large remediations  
**Repository role:** `MOBILE_CLIENT`  
**Architecture status:** `SHARED BACKEND FREEZE COMPLETE — STAGING NOT PROVISIONED`

**Honest end status:**

```text
PRE-STAGING AUDIT PASS WITH REMEDIATION — STAGING NOT YET AUTHORIZED
```

This document does **not** authorize staging provisioning, EAS builds, or production actions.

---

## A. Executive summary

### Current real state

- Mobile runs as an **Expo development client** on Samsung Galaxy S25 against **local** Supabase `vdb-digital-mobile-local` (`:54521`–`:54524`) + Metro `:8081`.
- Premium dashboard/navigation UI pass is **committed** at `b34988e`.
- Local quality gates for lint/typecheck/i18n/secret-scan/Jest/RLS/repo-integration/Maestro-syntax are **green**.
- `expo-doctor` reports **SDK package version mismatches** (1 failed check).
- Full Maestro **20/20** device suite remains **not proven** in one uninterrupted run.
- There is **no** shared staging Supabase and **no** linked EAS project ID in config.

### What really works (local)

- Auth login/roles against local stack (repo-integration + Maestro 01 evidence).
- Customer dashboard (premium UI) with seeded Matthijs / website project copy.
- RLS isolation suite **65/65**.
- Repository integration **19/19**.
- Fail-closed demo and Mollie/push/payout flags.

### What is development-only

- Dev client + Metro + `adb reverse` + cleartext localhost.
- Local seed identities & shared test password.
- Fake/demo payment paths when demo mode explicitly enabled.
- Document “scan clean” without real AV provider.
- Diagnostics screen (`isDevelopment`).

### Largest blockers before staging / standalone

1. Provision shared staging backend (owner) + pin contract/schema.
2. EAS project + secrets that **cannot** embed `127.0.0.1`.
3. Non–dev-client preview APK profile pointed at staging HTTPS.
4. Contract/schema alignment (`0.1.0` freeze vs 19 local proposal migrations).
5. Remaining UI consistency + deep-link router wiring.

---

## B. Git and repository

| Item          | Value                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| Branch        | `feature/vdb-mobile-app-v1`                                                                                     |
| HEAD          | `b34988ea4a990d734090fdaa56193450906fae25`                                                                      |
| Latest commit | `feat: refine premium mobile dashboard and navigation`                                                          |
| Push          | **Not pushed** (local only)                                                                                     |
| Tags          | `vdb-mobile-v1-local-pass`, `vdb-mobile-v1-integration-local-pass` — **no** `vdb-mobile-v1-android-device-pass` |
| Remote        | `origin` → `https://github.com/mvandenboslfgx/vdb-app.git`                                                      |

### Uncommitted (left outside UI commit — intentional)

- `docs/maestro-suite-manifest.md`
- `maestro/shared/login.yaml`
- `scripts/run-maestro-device.mjs`

### Reproduce for a new developer

1. `git checkout feature/vdb-mobile-app-v1` @ `b34988e`
2. `npm ci`
3. Copy `.env.example` → `.env` with local `:54521` + anon from `npx supabase status`
4. `npx supabase start` (project_id `vdb-digital-mobile-local`)
5. `npm run db:seed:identities` / device harness reset
6. Dev client + Metro

`.env` is **not** committed (correct). Local anon key in `.env` is the public Supabase **demo** anon JWT (not service role).

### Files that must not enter Git

- `.env`, keystores, APKs under `android/app/build`, Metro caches, Maestro debug dumps, personal screenshots with PII.

### Evidence worth keeping

- `docs/mobile-ui-audit.md`, `docs/ui-s25-*.png` (committed with UI pass)
- This audit + `docs/pre-staging-risk-register.md`

---

## C. Architecture

| Topic                | Status                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Role                 | `MOBILE_CLIENT`                                                                                     |
| Canonical backend    | VDB Digital 2.0 (`canonicalRepoHint`: `vdbdigital2.0`)                                              |
| Contract             | `vdb-backend-contract@0.1.0`, `schemaVersion` `2026.07.22.freeze`, status `MOBILE_ISOLATION_FREEZE` |
| Local project_id     | `vdb-digital-mobile-local`                                                                          |
| Ports                | API **54521**, DB **54522**, Studio **54523**, Inbucket **54524**, Metro **8081**                   |
| Staging              | **Not provisioned**                                                                                 |
| Production candidate | Documented ref `nhsrdnjfsxfikfbdmdfj` — **NOT APPLIED** / owner confirm                             |

### Isolation audit

| Check                                | Result                                             |
| ------------------------------------ | -------------------------------------------------- |
| Harness never `docker rm` siblings   | **PASS** — report-only (`device-test-harness.mjs`) |
| Expected project/ports enforced      | **PASS**                                           |
| Sibling path mutations in Mobile     | **PASS** (docs/scripts observe only)               |
| Historical hostile sibling watchdogs | **WARNING** (environment risk, not Mobile code)    |
| Active runtime config on `:54321`    | **PASS** — active config uses **54521**            |
| Docs still mentioning `54321`        | **WARNING** — historical evidence only             |

---

## D. Functionality

Vocabulary: REAL AND TESTED · REAL BUT DEVICE UNTESTED · PARTIAL · DEMO ONLY · STUB · BLOCKED

### Customer

| Flow                          | Classification                                              |
| ----------------------------- | ----------------------------------------------------------- |
| Login / session / SecureStore | REAL AND TESTED (local + Maestro 01)                        |
| Premium dashboard             | REAL AND TESTED (S25 visual + component tests)              |
| Projects list/detail/request  | REAL BUT DEVICE UNTESTED / partial Maestro history          |
| Messages / chat               | REAL BUT DEVICE UNTESTED (repo + prior S25 smoke)           |
| Quotes accept/reject          | REAL BUT DEVICE UNTESTED                                    |
| Invoices list                 | REAL BUT DEVICE UNTESTED                                    |
| Invoice checkout              | **BLOCKED** (`mollieCheckout` false)                        |
| Documents upload              | REAL AND TESTED (component + local RPC); device suite flaky |
| Support                       | PARTIAL                                                     |
| Appointments                  | REAL BUT DEVICE UNTESTED                                    |
| Reviews                       | PARTIAL (`publishConsent` not persisted)                    |
| Account deletion request      | REAL BUT DEVICE UNTESTED                                    |
| Notification prefs            | PARTIAL (local prefs only)                                  |

### Partner

| Flow                          | Classification                                                |
| ----------------------------- | ------------------------------------------------------------- |
| Application / profile / leads | REAL BUT DEVICE UNTESTED (local/UI tests strong)              |
| Commissions list              | REAL BUT DEVICE UNTESTED                                      |
| Payout request                | **BLOCKED** by default flag; REAL when flag on locally        |
| Marketing assets              | PARTIAL (link copy; `marketing_assets` table missing locally) |

### Admin

| Flow                         | Classification                      |
| ---------------------------- | ----------------------------------- |
| Dashboard / queue            | REAL BUT DEVICE UNTESTED            |
| Partner approve/reject       | REAL BUT DEVICE UNTESTED            |
| Tickets reply / internal     | REAL AND TESTED (component + RLS)   |
| Finance commission/payout UI | REAL AND TESTED locally; flag-gated |
| Lead qualify/convert         | REAL AND TESTED locally             |

### Demo / stubs

- All `shouldUseMockApi()` branches: **DEMO ONLY** when demo explicitly enabled.
- Notifications feature repository: **STUB** (always mock).
- Edge Functions under `supabase/functions/`: **STUB** (not deployed).

---

## E. Security

| Area                                           | Result                                      |
| ---------------------------------------------- | ------------------------------------------- |
| Service-role in app/`EXPO_PUBLIC_*`            | **PASS** — not present                      |
| Secret-scan gate                               | **PASS** (light patterns; gaps noted R-20)  |
| Demo service-role JWT                          | Local seed script only — **WARNING**        |
| Test password in Maestro/docs                  | **WARNING** for staging reuse (R-08)        |
| RLS suite                                      | **65/65 PASS**                              |
| Repo integration auth/isolation                | **19/19 PASS**                              |
| Client cannot force invoice `paid`             | **PASS** (mapper/policy)                    |
| Mollie live                                    | **Fail-closed**                             |
| Storage private `documents` + 300s signed URLs | **PASS** pattern; AV **PARTIAL**            |
| SECURITY DEFINER + `search_path=public`        | Present; grants revoked from PUBLIC on RPCs |
| Flag key drift contract vs DB                  | **FAIL for confidence** (R-07)              |

---

## F. UI/UX

| Area                             | Status                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Customer dashboard premium pass  | Done (committed)                                                                                            |
| Tab icons MaterialCommunityIcons | Done (customer/partner/admin)                                                                               |
| Seed customer-facing copy        | Done in seed script                                                                                         |
| Remaining ListRow screens        | **Open** — projects, messages, docs, quotes, invoices, appointments, support, partner/admin homes, settings |
| Accessibility scanner            | PENDING (known limitation)                                                                                  |
| NL/EN translations gate          | PASS                                                                                                        |
| Safe areas on dashboard/tabs     | Improved; full app recheck needed                                                                           |

---

## G. Android

| Item                      | Value                                                           |
| ------------------------- | --------------------------------------------------------------- |
| Package                   | `nl.vdbdigital.app`                                             |
| versionName / versionCode | `1.0.0` / `1`                                                   |
| Current build             | Debug **development client**                                    |
| Cleartext                 | Enabled in **debug** manifests only                             |
| Why PC/USB needed         | Dev client ↔ Metro; backend `127.0.0.1:54521` via `adb reverse` |
| Standalone blockers       | No online backend; no preview APK; EAS project ID empty         |

**Native changes requiring new APK:** icons already in JS (hot reload OK); new native modules / intent filters / permissions / splash → new build.

---

## H. EAS

| Item                                               | Classification                                |
| -------------------------------------------------- | --------------------------------------------- |
| `eas.json` profiles development/preview/production | **PARTIAL**                                   |
| `extra.eas.projectId`                              | **MISSING** (empty env)                       |
| `owner`                                            | **OWNER ACTION REQUIRED** (`EAS_OWNER`)       |
| Preview env secrets (URL/anon/demo)                | **MISSING**                                   |
| Internal APK profile                               | **PARTIAL** (defined, never built this audit) |
| Production AAB                                     | **MISSING** / forbidden                       |
| Update channels / runtimeVersion                   | **MISSING** / not audited as configured       |

**Start no build** — confirmed.

---

## I. Staging needs (exact)

| Deliverable                                                        | Owner                              |
| ------------------------------------------------------------------ | ---------------------------------- |
| Create staging Supabase project + region                           | Matthijs / CANONICAL_BACKEND_OWNER |
| Auth redirect allowlist + schemes                                  | Owner + MOBILE_CLIENT              |
| Apply **canonical** migrations (not Mobile free-hand)              | CANONICAL_BACKEND_OWNER            |
| RLS / Storage / Edge deploy                                        | CANONICAL_BACKEND_OWNER            |
| Publish contract bump matching staging schema                      | CANONICAL_BACKEND_OWNER            |
| Seed **non-public** staging test accounts                          | Matthijs                           |
| Feature flags rows with **canonical keys**                         | Owner                              |
| EAS secrets: HTTPS URL, anon, `ENABLE_DEMO_MODE=false`, Sentry DSN | Matthijs                           |
| Mobile pin `schemaVersion` + regenerate types                      | MOBILE_CLIENT                      |
| Partner client align same contract                                 | PARTNER_CLIENT (later)             |
| Observability + retention                                          | Owner                              |
| Virus scan limitation documented                                   | Owner                              |

Mobile must **not** apply remote migrations.

---

## J. Tests (this audit run)

Commands executed (local):

| Command                         | Result                                |
| ------------------------------- | ------------------------------------- |
| `npm run lint`                  | PASS                                  |
| `npm run typecheck`             | PASS                                  |
| `npm run check:translations`    | PASS                                  |
| `npm run secret-scan`           | PASS                                  |
| `npm test`                      | **26 suites / 114 tests PASS**        |
| `npm run test:components`       | **14 suites / 61 tests PASS**         |
| `npm run test:repo-integration` | **19/19 PASS**                        |
| `npm run test:rls`              | **65/65 PASS**                        |
| `npm run test:maestro:syntax`   | **20/20 PASS**                        |
| `npx expo-doctor`               | **FAIL** (1 check — package versions) |
| `npx supabase db reset` + seed  | PASS                                  |

`npm ci` was **not** re-run in this session (existing `node_modules` + lockfile used). Recommend clean `npm ci` before any EAS attempt.

| Category                         |      Suites | Tests | Passed | Failed |                                 Blocked |
| -------------------------------- | ----------: | ----: | -----: | -----: | --------------------------------------: |
| Jest unit+component (`npm test`) |          26 |   114 |    114 |      0 |                                       0 |
| Component subset                 |          14 |    61 |     61 |      0 |                                       0 |
| Repo integration                 |           1 |    19 |     19 |      0 |                                       0 |
| RLS                              | 2 SQL packs |    65 |     65 |      0 |                                       0 |
| Maestro syntax                   |    20 flows |    20 |     20 |      0 |                                       0 |
| Maestro device full suite        |           — |    20 |      — |      — | **Blocked** (USB/infra; no clean 20/20) |
| expo-doctor                      |   20 checks |     — |     19 |      1 |                                       0 |

Historical device evidence is **separated**: prior partial Maestro/S25 results ≠ current green local gates.

---

## K. Play Store

| Item                                       | Classification                 |
| ------------------------------------------ | ------------------------------ |
| Package / name                             | READY (config)                 |
| Store copy drafts                          | PARTIAL (`docs/store/`)        |
| Privacy + account deletion URLs            | PARTIAL / OWNER — must be live |
| Data Safety draft                          | PARTIAL                        |
| Reviewer account                           | OWNER ACTION REQUIRED          |
| Signing / AAB                              | BLOCKED                        |
| Device validation gate                     | BLOCKED (no 20/20)             |
| Affiliate / payouts / digital goods policy | LEGAL REVIEW REQUIRED          |
| Upload                                     | **Forbidden**                  |

---

## L. Risk register

See `docs/pre-staging-risk-register.md`.

| Severity | Count |
| -------- | ----: |
| P0       |     4 |
| P1       |     8 |
| P2       |     6 |
| P3       |     2 |

---

## M. Gates

| Gate                            | Decision  | Conditions                                                          |
| ------------------------------- | --------- | ------------------------------------------------------------------- |
| **A** Further local development | **GO**    | Stay on `5452x`; no sibling docker kills; continue UI pass          |
| **B** Staging provision         | **NO-GO** | Needs owner project + secrets plan; Mobile audit alone insufficient |
| **C** Staging migrations apply  | **NO-GO** | CANONICAL_BACKEND_OWNER only after contract alignment               |
| **D** EAS preview APK           | **NO-GO** | Needs EAS project ID, secrets, no localhost, doctor/deps fix        |
| **E** Standalone without PC     | **NO-GO** | Depends on D + online staging                                       |
| **F** Cross-repo tests          | **NO-GO** | Staging + shared contract first                                     |
| **G** Play internal test        | **NO-GO** | E + policy + signing + device proof                                 |
| **H** Production activation     | **NO-GO** | Explicit owner approval forever                                     |

**Conditional future path:** after R-01–R-03 closed → Gate B **CONDITIONAL GO**; after preview secrets validated → Gate D **CONDITIONAL GO**.

---

## N. Prioritized remediation plan

### 1. Must before staging

1. Owner provisions staging Supabase.
2. Align/publish backend contract + schema (resolve `leads`/`partner_leads`, `profiles`/`app_profiles`, RPC list, flag keys).
3. EAS init + secrets matrix (HTTPS, anon, demo false).
4. Staging test accounts **outside** public Maestro files.
5. Document AV-scan limitation.

### 2. Must before standalone APK

1. EAS `preview` non–dev-client APK.
2. Prove no `127.0.0.1` in binary/env.
3. Wire deep-link → router.
4. Fix `expo install --check` mismatches.

### 3. Must before cross-repo

1. Shared staging + identical `schemaVersion` on Mobile + Partner + Website.
2. Cross-repo smoke plan from `docs/cross-repository-test-plan.md`.

### 4. Must before Play Store

1. Live privacy/deletion URLs + Data Safety.
2. Signing + AAB.
3. Clean Maestro **20/20** + tag policy.
4. Legal review of payments/affiliate.
5. Full UI consistency pass for store screenshots.

### 5. Can later

1. Push provider.
2. Live Mollie (production).
3. Real virus scanning.
4. Dual four-eyes finance polish.
5. Doc cleanup of historical `:54321` references.

---

## O. Answers to the five critical questions

1. **Is the UI pass committed and reproducible?**  
   **Yes** — `b34988e` on `feature/vdb-mobile-app-v1`. Unrelated Maestro harness edits remain uncommitted.

2. **Will staging config ever point at `127.0.0.1:54521`?**  
   **Not if secrets are set correctly** — code fail-closes missing Supabase in preview/production, but **EAS does not yet pin URL**; mis-secret is a real risk (**R-03**).

3. **Does local Mobile contract match what VDB Digital 2.0 will own?**  
   **Not yet** — freeze pin `0.1.0` / `2026.07.22.freeze` is thinner than 19 local proposal migrations; naming/RPC drift remains (**R-02**).

4. **Any service-role / payment / admin secrets in app bundle?**  
   **No evidence in client source**; secret-scan PASS. Local seed holds demo service-role JWT for **scripts only**. Keep out of EAS public env.

5. **What is real vs fixture/fake-only?**  
   Most customer/partner/admin **repositories are real against local Supabase**. Payments/push/payouts **fail-closed**. Demo mocks only when explicitly enabled. Device proof is **partial**; local RLS/repo tests are the strong evidence.

---

## Honest end status (exact)

```text
PRE-STAGING AUDIT PASS WITH REMEDIATION — STAGING NOT YET AUTHORIZED
```

**Is Mobile ready to safely move to shared staging and then a standalone preview APK?**  
**Not yet.** Local isolation, fail-closed client policy, and green local gates are solid. Staging/EAS/standalone require owner backend + secrets + contract alignment first.
