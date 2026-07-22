# Environment matrix

**Repository role:** `MOBILE_CLIENT`
**Updated:** 2026-07-22

## Local stacks (must not collide)

| Repo | `project_id` | API | DB | Studio | Inbucket |
|---|---|---|---|---|---|
| VDB Digital 2.0 | `vdbdigital2` | **54321** (default) | **54322** | 54323 | 54324 |
| VDB Partner Portal | `vdb-partners` | **54421** | **54422** | 54423 | 54424 |
| **VDB Digital Mobile** | `vdb-digital-mobile-local` | **54521** | **54522** | 54523 | 54524 |

Mobile Metro remains on **8081**. Device validation uses `adb reverse` for `54521` and `8081`.

> **2026-07-22 change:** Mobile moved off 54321/54322 so it no longer fights `vdbdigital2` for the same host ports. Historical device evidence docs may still mention 54321 from earlier runs.

## Shared remote environments

| Env | Supabase | Clients |
|---|---|---|
| Staging | One shared VDB staging project (TBD / owner-provisioned) | Website + Mobile + Partner Portal |
| Production | Official VDB production (`nhsrdnjfsxfikfbdmdfj` candidate — owner confirm) | Website + Mobile + Partner Portal |

## Mobile client env vars

| Variable | Local | Staging | Production |
|---|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | `development` | `preview` (or staging label) | `production` |
| `EXPO_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54521` | shared staging URL | production URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | local anon | staging publishable | production publishable |
| `EXPO_PUBLIC_ENABLE_DEMO_MODE` | optional true only in development/test | **false** | **false** |
| Backend contract | `contracts/backend-contract.json` | must match staging published version | must match production published version |

Server secrets (service role, Mollie private keys) never ship in the mobile client.

## Isolation rule

Agents in this repo start/stop **only** `vdb-digital-mobile-local`. Sibling stacks may run in parallel on their own ports. Conflicts are reported, never “fixed” by removing sibling containers.
