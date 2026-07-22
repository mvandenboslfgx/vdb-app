# Migration ownership

**Canonical owner:** VDB Digital 2.0 (`CANONICAL_BACKEND_OWNER`)
**This repo:** Mobile (`MOBILE_CLIENT`) — local proposals only

## Ownership table

| Artifact | Owner | Mobile |
|---|---|---|
| Production / staging migrations | VDB Digital 2.0 | Propose only |
| RLS / Storage policies | VDB Digital 2.0 | Propose only |
| Financial RPCs / commission logic | VDB Digital 2.0 | Call, never redefine remotely |
| Edge Functions (checkout, Mollie, approvals) | VDB Digital 2.0 | Local copies for tests only |
| Published `Database` types + contract | VDB Digital 2.0 | Consume + pin `schemaVersion` |
| Local `supabase/migrations/*` in Mobile | Mobile (proposal) | Apply only to `vdb-digital-mobile-local` |

## Remote project reference

Historical / candidate production ref documented elsewhere as `nhsrdnjfsxfikfbdmdfj` (“vdb nieuw”).
**Owner must confirm** before any remote action. Mobile agents must not apply migrations there.

## Proposal workflow

```text
Mobile need (e.g. push_tokens)
  → backend change proposal doc
  → local migration + local tests
  → no remote apply
  → land in VDB Digital 2.0
  → publish contract bump
  → Mobile updates schemaVersion + types
```

## Forbidden without explicit owner approval

- `supabase db push` / remote migration to staging or production
- remote `db reset`
- production Edge deploy
- live Mollie
- Git push / Play Store upload from agent initiative
