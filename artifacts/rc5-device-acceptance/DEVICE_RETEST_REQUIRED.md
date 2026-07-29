# DEVICE RETEST REQUIRED

**Date:** 2026-07-29

## Statement

The partner-approval defect is fixed **in Mobile source only**.

The Samsung S25 still runs APK:

- EAS build `4bafc872-8af3-491d-b11d-b68beca0426f`
- versionCode `3`
- SHA-256 `21245128…B56E72`

That binary does **not** include this fix.

## Therefore

- Do **not** claim the S25 is repaired
- Do **not** retest approval on the current APK expecting PASS
- A **new** internal staging APK authorization is required
- No second build was started in this gate

## Retest prerequisites (next authorization)

1. Scoped freeze of approval fix commit
2. New preview/internal APK (likely versionCode `4`)
3. Synthetic PENDING application only
4. Repeat AAL2_SESSION_TEST_ONLY on Goedkeuren
5. Confirm partner remains fail-closed / not auto-ACTIVE after staff approval
