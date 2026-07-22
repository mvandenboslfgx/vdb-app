# Backend contract

**Package:** `vdb-backend-contract@0.1.0`
**File:** `contracts/backend-contract.json`
**`schemaVersion`:** `2026.07.22.freeze`
**Status:** Mobile isolation freeze pin — awaiting sibling alignment to the same canonical version

## Purpose

One versioned contract shared conceptually across Website, Mobile, and Partner Portal:

- generated Database types (canonical from owner repo)
- roles / enums / statuses
- RPC names
- Zod schemas (client-side mirrors)
- feature flags
- error codes
- `schemaVersion`

Every client records which contract version it builds against.

## Mobile rules

1. Do not invent a second production schema.
2. Local SQL under `supabase/migrations/` is a **proposal** until landed in VDB Digital 2.0.
3. After the owner publishes a further contract bump, update `version` + `schemaVersion` here and regenerate/consume types.
4. Staging/preview builds should fail when contract version ≠ intended staging version (drift check — to be wired in CI).

## Drift check (planned)

| Check | Expected |
|---|---|
| Client `vdb-backend-contract@version` + `schemaVersion` | Equals staging/production published contract |
| Mismatch | Fail build / fail device health gate for non-local envs |

## Related docs

- `docs/mobile-web-identity-contract.md` — Auth/session identity
- `docs/migration-ownership.md` — who may apply what
- `docs/backend-integration-map.md` — table mapping notes
- `docs/mobile-shared-backend-isolation-pass.md` — isolation gate evidence
