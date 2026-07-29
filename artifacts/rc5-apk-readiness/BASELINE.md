# RC5 STAGING APK READINESS — BASELINE

**Date:** 2026-07-29  
**Session:** RC5 Final Remediation

## Repository

| Field | Value |
|---|---|
| Path | `C:\Users\XXX\vdb-app` |
| Branch | `fix/a5-owner-contract-runtime` |
| HEAD | `c7af8aa7c997fb7f00381aa196eb56927d656220` |
| Base commit confirmed | YES |

## Cross-repository basis

| Repo | Commit |
|---|---|
| Owner RC5 | `8264893c25ba6438393c0469fcc623c68fbfa93d` |
| Suspended fixture | `b1b244b2db9524a9db456b1f2b46ba212f52d9c2` |
| MFA/AAL2 fixture | `aaed7ddf54e2efffc018e54bf96b7a03fc8aa69a` |
| Mobile RC5 | `c7af8aa7c997fb7f00381aa196eb56927d656220` |
| Partners RC5 | `e8d6f62b3384a59d0ce9e2c607c6fd6245bb59ec` |

## App configuration

| Field | Value |
|---|---|
| versionName | `1.0.0` |
| versionCode | `2` (frozen — not bumped in this gate) |
| Proposed next versionCode | `3` |
| Package ID | `nl.vdbdigital.app` |
| EAS project ID | `b1be524b-fed0-4cb3-9eca-65795c82d768` |

## Contract pin

| Field | Value |
|---|---|
| packageId | `vdb-backend-contract@0.2.0-rc.5` |
| version | `0.2.0-rc.5` |
| schemaVersion | `2026.07.29.partner-identity-directory-rc5` |
| status | `CONSUMER_PIN_OWNER_RC5` |

## Environment bindings

| Env | Supabase ref |
|---|---|
| preview (staging) | `qzekuvmgfekzsowdecyk` |
| production | `nhsrdnjfsxfikfbdmdfj` |

RC5 is **not** promoted to production — staging-only APK.

## EAS profiles

| Profile | distribution | environment | buildType | autoSubmit |
|---|---|---|---|---|
| preview | internal | preview | apk | false |
| production | store | production | — | false |
| production-apk | internal | production | apk | false |

## Signing

Android signing configured via EAS credentials — no local keystore tracked in repo.

## Sentry

`SENTRY_DISABLE_AUTO_UPLOAD=true` set on preview/production/production-apk profiles.
Sourcemap upload skipped in this internal staging APK.

## Dirty tree classification (at baseline)

| File | Classification |
|---|---|
| `M tsconfig.json` | pre-existing (CRLF lint, not introduced by this session) |
| `?? artifacts/rc3-preview/` | build artifact (NOT to be committed) |
| `?? artifacts/rc3-production/**` | build artifact (NOT to be committed) |
| `?? artifacts/rc5-apk-readiness/` | evidence (committed in scoped freeze) |
