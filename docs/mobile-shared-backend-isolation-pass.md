# Mobile shared-backend / local isolation gate

**Date:** 2026-07-22
**Verdict:**

```text
VDB MOBILE SHARED BACKEND AND LOCAL ISOLATION PASS
```

## Evidence checklist

| Requirement | Result |
|---|---|
| `project_id` | `vdb-digital-mobile-local` |
| API | `54521` |
| DB | `54522` |
| Studio | `54523` |
| Mail (Inbucket) | `54524` |
| Contract | `vdb-backend-contract@0.1.0` |
| `schemaVersion` | `2026.07.22.freeze` |
| Sibling resources changed | **NO** (only `vdb-app` paths) |
| Remote actions | **NONE** |

## Role

`REPOSITORY_ROLE=MOBILE_CLIENT` (`AGENTS.md`)

## Isolation

- Harness reports sibling stacks; does not stop/remove them
- Mobile does not bind `54321`/`54322` or `54421`/`54422` (those remain sibling ranges)

## Explicitly not claimed

```text
CROSS-REPOSITORY INTEGRATION PASS
SHARED STAGING PROVISIONED
vdb-mobile-v1-android-device-pass
```
