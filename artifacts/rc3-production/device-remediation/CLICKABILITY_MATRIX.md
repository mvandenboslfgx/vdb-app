# Clickability matrix (Phase 1 update)

Machine-readable companions: `clickability-matrix.json`, `clickability-matrix.ts` (may lag; this markdown is authoritative for Phase 1).

**Rule:** no silent no-op. Missing detail backend → explicit **Nog niet beschikbaar**.

| ID                               | Role     | Screen        | Element               | Handler           | Status                | Notes                                |
| -------------------------------- | -------- | ------------- | --------------------- | ----------------- | --------------------- | ------------------------------------ |
| admin-tab-home                   | admin    | tabbar        | Home                  | yes               | code_ok               | RC4 dashboard RPCs wired             |
| admin-tab-approvals              | admin    | tabbar        | Goedkeuringen         | yes               | code_ok               | work queue wired                     |
| admin-tab-tickets                | admin    | tabbar        | Tickets               | yes               | code_ok               | list→detail                          |
| admin-tab-finance                | admin    | tabbar        | Financiën             | yes               | code_ok               | AAL2 step-up on commission mutations |
| admin-tab-more                   | admin    | tabbar        | Meer                  | yes               | code_ok               | max 5 tabs                           |
| admin-tab-leads-hidden           | admin    | tabbar        | leads                 | href:null         | code_ok               | under Meer                           |
| admin-more-leads                 | admin    | Meer          | Partnerleads          | yes               | code_ok               |                                      |
| admin-more-directory-lists       | admin    | Meer          | products…appointments | yes               | code_ok               | lists via admin_list_*               |
| admin-more-directory-detail      | admin    | directory row | detail                | Alert unavailable | blocked_owner_rpc     | release blocker                      |
| admin-more-partners-lifecycle    | admin    | Partners      | suspend/reactivate    | yes               | code_ok               | AAL2 modal                           |
| admin-more-settings              | admin    | Meer          | Instellingen          | yes               | code_ok               |                                      |
| admin-more-security              | admin    | Meer          | Beveiliging           | yes               | code_ok               |                                      |
| admin-more-whatsapp              | admin    | Meer          | WhatsApp              | yes               | code_ok               | 31628600727                          |
| admin-more-logout                | admin    | Meer          | Uitloggen             | yes               | code_ok               |                                      |
| admin-home-retry                 | admin    | Home          | Opnieuw proberen      | yes               | code_ok               |                                      |
| admin-finance-commission-actions | admin    | Financiën     | approve/reject        | yes               | code_ok               | AAL2 step-up                         |
| admin-finance-payout-process     | admin    | Financiën     | process               | explained         | unavailable_explained | Owner disabled                       |
| admin-tickets-internal-note      | admin    | Ticket detail | internal              | yes               | flag_closed           | FEATURE_DISABLED → explicit copy     |
| customer-more-whatsapp           | customer | Meer          | WhatsApp              | yes               | code_ok               | no PII                               |
| partner-more-whatsapp            | partner  | Meer          | WhatsApp              | yes               | code_ok               |                                      |
| partner-more-payout              | partner  | Meer          | payout                | conditional       | unavailable_explained | flag off                             |

Device column: **not claimed** (no new APK).
