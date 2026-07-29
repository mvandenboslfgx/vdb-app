# Clickability matrix (code audit)

Machine-readable source: `clickability-matrix.json`
Source rows: `clickability-matrix.ts`

| ID                               | Role     | Screen    | Element          | Handler     | Status                | Notes                           |
| -------------------------------- | -------- | --------- | ---------------- | ----------- | --------------------- | ------------------------------- |
| admin-tab-home                   | admin    | tabbar    | Home             | yes         | blocked_owner_rpc     | Dashboard RPCs missing          |
| admin-tab-approvals              | admin    | tabbar    | Goedkeuringen    | yes         | blocked_owner_rpc     | admin_work_queue                |
| admin-tab-tickets                | admin    | tabbar    | Tickets          | yes         | code_ok               | portal_support_tickets          |
| admin-tab-finance                | admin    | tabbar    | Financiën        | yes         | code_ok               | reads OK; mutations unavailable |
| admin-tab-more                   | admin    | tabbar    | Meer             | yes         | code_ok               | max 5 tabs                      |
| admin-tab-leads-hidden           | admin    | tabbar    | leads            | href:null   | code_ok               | under Meer                      |
| admin-more-leads                 | admin    | Meer      | Partnerleads     | yes         | code_ok               |                                 |
| admin-more-products…security     | admin    | Meer      | day-1 surfaces   | yes         | unavailable_explained | placeholders                    |
| admin-more-whatsapp              | admin    | Meer      | WhatsApp         | yes         | code_ok               | 31628600727                     |
| admin-more-logout                | admin    | Meer      | Uitloggen        | yes         | code_ok               |                                 |
| admin-home-retry                 | admin    | Home      | Opnieuw proberen | yes         | blocked_owner_rpc     | cannot succeed yet              |
| admin-finance-commission-actions | admin    | Financiën | approve/reject   | no          | unavailable_explained | Owner RPC                       |
| admin-finance-payout-process     | admin    | Financiën | process          | no          | unavailable_explained | Owner: disabled                 |
| customer-more-whatsapp           | customer | Meer      | WhatsApp         | yes         | code_ok               | no PII                          |
| partner-more-whatsapp            | partner  | Meer      | WhatsApp         | yes         | code_ok               |                                 |
| partner-more-payout              | partner  | Meer      | payout           | conditional | unavailable_explained | flag off → no onPress           |

**Rule:** `fail` = visible interactive without effect. None remaining for WhatsApp/nav after this pass; admin Home/Approvals remain `blocked_owner_rpc`.

Device column: pending S25 after next APK.
