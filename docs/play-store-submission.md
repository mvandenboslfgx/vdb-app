# Play Store Submission

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

Package: `nl.vdbdigital.app`  
Name: **VDB Digital** — Software & Project Portal

## Store texts

See `docs/store/` for NL + EN short/full descriptions.

## Data safety (draft)

Declare collection of:

- Personal info (name, email, phone)
- Financial info (invoice metadata — not full PAN; Mollie hosts checkout)
- App activity (support, in-app messages)
- Device/app IDs (push tokens)

Purposes: app functionality, account management, fraud prevention, customer support.
Encryption in transit: yes. Deletion: supported via in-app + web URL.

## Review account instructions

Provide Play Console reviewers:

1. Username/email of seeded customer account
2. Password (rotated after review)
3. Notes: payments use Mollie **test** mode; no real charges
4. Partner/admin features may be feature-flagged off

## Preview / internal test readiness

| Item                | Status                                |
| ------------------- | ------------------------------------- |
| Debug APK on device | **BLOCKED** — Android SDK missing     |
| EAS project linked  | **BLOCKED BY EAS CONFIGURATION**      |
| Preview AAB built   | Not started                           |
| Play Store upload   | **Forbidden** until explicit approval |

## Do not publish without

- Owner approval
- Privacy policy URL live
- Account deletion URL live
- Production signing via EAS
- Policy gate reviewed for catalog contents
- Successful Samsung S25 device validation (Phase 6)
