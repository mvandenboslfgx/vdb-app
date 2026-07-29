# Repository responsibilities

**This repo:** VDB Digital Mobile (`MOBILE_CLIENT`)

| Repository                     | Role                      | Owns                                                                                |
| ------------------------------ | ------------------------- | ----------------------------------------------------------------------------------- |
| VDB Digital 2.0                | `CANONICAL_BACKEND_OWNER` | Website, web admin, production migrations, RLS, Edge Functions, published contracts |
| VDB Digital Mobile             | `MOBILE_CLIENT`           | Android/iOS Expo client, local mobile test stack, Maestro device suite, mobile UX   |
| VDB Partner Portal / Affiliate | `PARTNER_CLIENT`          | Seller web portal (leads, sales, commissions, payouts UI)                           |

## Mobile may

- Build customer / partner / staff mobile UI against typed repositories
- Run an isolated local Supabase for device tests
- Propose backend changes (docs + local SQL proposals)
- Consume published contract versions
- Run Maestro and local RLS/unit tests

## Mobile must not

- Apply remote production or staging schema as owner of truth
- Invent parallel auth or parallel financial ledgers
- Stop sibling containers or reclaim sibling ports
- Push production, live Mollie, or Play Store without owner approval

## Change flow for schema needs

1. Document proposal (tables, RLS, RPCs, tests)
2. Apply locally under `supabase/migrations/` for Mobile validation only
3. Hand off to VDB Digital 2.0 for canonical landing
4. Bump `contracts/backend-contract.json` `schemaVersion` after owner publish
