# Local pre-staging remediation — evidence

**Date:** 2026-07-24  
**Branch:** `feature/vdb-mobile-app-v1`  
**Base audit commit:** `9105564` (`docs: add pre-staging readiness audit and risk register`)  
**Scope:** Local fixes only — **no** staging provision, **no** EAS build, **no** Git push/tag, **no** remote secrets

**Honest end status:**

```text
LOCAL PRE-STAGING REMEDIATION PASS — STAGING STILL NOT AUTHORIZED
```

---

## What was remediable locally (done)

| Risk | Action | Result |
|---|---|---|
| **R-02** Contract / RPC / naming drift | Bumped `contracts/backend-contract.json` → `0.1.1` / `schemaVersion` `2026.07.24.remediation`; tables, RPCs, naming aliases, canonical flag keys documented | Local proposal pin updated; **owner must still publish** matching staging contract |
| **R-03** Unsafe EAS preview/prod config | `eas.json`: `developmentClient: false` + `ENABLE_DEMO_MODE=false` for preview/production; `scripts/validate-eas-env.mjs` + `npm run check:eas-env`; `env.ts` rejects localhost Supabase URL when `APP_ENV` is preview/production | Config prep + local gate green; **EAS project/secrets still required before build** |
| **R-04** Standalone APK (config only) | Preview/production profiles no longer declare a development client | Ready for a future preview APK; **APK itself not built** (blocked by R-01 staging URL) |
| **R-07** Feature-flag key mismatch | Migration `20260724140000_canonicalize_feature_flag_keys.sql`; seeds/RPCs/smoke aligned on `mollie_checkout` / `digital_product_checkout` / `partner_payouts`; local seed enables `partner_payouts` for tests only | Local fail-closed + test enablement consistent |
| **R-10** Deep links / router | `DeepLinkHandler` wired in `AppProviders`; `deepLinkToHref` uses `/(customer)`, `/(partner)`, `/(admin)` groups | Unit tests pass; live App Links / `assetlinks.json` still staging-owned |
| **R-15** Expo SDK mismatches | `npx expo install --fix` → `expo-doctor` **20/20** | Green |

---

## Still blocked (honest — not local remediations)

| Risk | Why still open |
|---|---|
| **R-01** Shared staging Supabase | Owner must provision; Mobile only consumes published HTTPS URL/anon |
| **R-02** Owner publish | Mobile pin is proposal until VDB Digital 2.0 publishes |
| **R-03** EAS secrets / project ID | `EAS_PROJECT_ID` empty; URL/anon must be EAS Secrets at build time — never committed |
| **R-04** Actual preview APK | Requires staging URL + authorized EAS build |
| **R-05** Maestro 20/20 device session | USB/ADB infra; not re-run as device suite in this pass |
| **R-06 / R-18** Live Mollie / payouts | Fail-closed by design until owner Edge + financial RPCs |
| **R-08** Local test credentials | Remain local-only; must not be reused on staging |
| **R-19** Play Store | Separate legal/store track |

---

## Quality gates re-run (local)

| Gate | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run check:translations` | PASS (16 namespaces) |
| `npm run secret-scan` | PASS |
| `npm test` | PASS — **116** tests |
| `npm run test:components` | PASS — **61** tests |
| `npx supabase db reset` | PASS (incl. `20260724140000_*`) |
| `npm run db:seed:identities` | PASS |
| `npm run test:rls` | PASS — **65/65** |
| `npm run test:repo-integration` | PASS — **19/19** |
| `npm run test:maestro:syntax` | PASS — **20/20** syntax |
| `npx expo-doctor` / `npm run doctor` | PASS — **20/20** |
| `npm run check:eas-env` | PASS |

**Not run (by design):** EAS build, device Maestro suite, Git push, staging provision.

---

## Explicit non-authorizations

- Staging backend **not** provisioned and **not** authorized by this pass.
- Preview/production APK **not** authorized.
- Play Store **not** in scope.

Next decision (separate): provision shared staging backend, then optionally authorize a preview APK.
