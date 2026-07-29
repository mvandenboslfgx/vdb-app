# Cross-repository test plan

**Status:** documented scenarios — execute on shared staging when available
**Local:** each repo validates its own UI against its isolated stack
**Coupling proof:** shared staging only

## Minimum scenarios

| #   | Scenario                                                           | Actors                 | Pass criteria                                       |
| --- | ------------------------------------------------------------------ | ---------------------- | --------------------------------------------------- |
| 1   | Customer registers on website, logs in on Mobile with same account | Website + Mobile       | Same `auth.users` / profile; session works on both  |
| 2   | Customer creates request in Mobile; admin sees it on website       | Mobile + Website admin | Same row; RLS allows admin, denies other customers  |
| 3   | Admin updates project; customer sees update in Mobile              | Website + Mobile       | Realtime or refresh shows same milestone/status     |
| 4   | Partner registers lead in Partner Portal                           | Portal                 | Lead row exists with partner attribution            |
| 5   | Admin handles lead in VDB Digital 2.0                              | Website admin          | Status transitions server-side                      |
| 6   | Partner sees sale status in Portal **and** Mobile                  | Portal + Mobile        | Identical sale/commission linkage                   |
| 7   | Customer payment confirmed server-side                             | Edge + DB              | Payment events; client never marks paid             |
| 8   | One shared commission created                                      | DB                     | Single commission record — no mobile-only duplicate |
| 9   | Payout status identical in Portal and Mobile                       | Portal + Mobile        | Same `payout_requests` status                       |
| 10  | RLS blocks other users’ data                                       | All                    | Negative tests: cross-tenant reads fail             |

## Local vs staging

| Layer                        | Where                                           |
| ---------------------------- | ----------------------------------------------- |
| Maestro 20-flow device suite | Mobile local stack (`vdb-digital-mobile-local`) |
| Partner portal UI tests      | Partner local stack                             |
| Website admin tests          | Website local stack                             |
| Scenarios 1–10               | **Shared staging**                              |

Do not treat three green local suites as proof of platform coupling.

## Mobile device suite note

Re-run the full Samsung S25 20/20 Maestro suite only after:

1. Port isolation is stable (this repo on 54521+)
2. Sibling agents are not destroying this stack
3. Prefer: shared staging green for coupling scenarios first when available
