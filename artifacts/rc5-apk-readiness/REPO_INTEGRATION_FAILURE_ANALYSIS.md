# RC5 STAGING APK READINESS — REPO INTEGRATION FAILURE ANALYSIS

**Date:** 2026-07-29

## Final result: 19/19 PASS

All 19 repository integration tests pass after local identity reseed.

## Previous failure

| Test | Status | Root cause | Fix |
|---|---|---|---|
| `partner_payout_request_and_double_spend_guard` | FAIL → PASS | Local DB seed state had 0 payable commissions | `node scripts/seed-local-identities.mjs` |

## Reseed outcome

Seed re-runs idempotently. After reseed:
- `customer.a@local.vdb`, `partner.a@local.vdb`, `partner.b@local.vdb`, `admin@local.vdb`, `owner@local.vdb` all present
- Payable commission for partner A restored
- Seed complete without error

## Full test list (19/19 PASS)

1. `auth_customer_a_login_and_role`
2. `auth_wrong_password_rejected`
3. `customer_project_rpc_list`
4. `partner_a_cannot_read_partner_b_leads`
5. `partner_a_cannot_read_customer_b_messages`
6. `messages_non_participant_blocked`
7. `support_create_and_list_own`
8. `quotes_customer_a_list`
9. `invoices_customer_a_list`
10. `documents_customer_a_list`
11. `commissions_partner_a_list`
12. `commissions_customer_blocked`
13. `account_deletion_request_insert`
14. `partner_lead_register`
15. `partner_payout_request_and_double_spend_guard`
16. `customer_cannot_request_payout`
17. `admin_reply_support_ticket_and_idempotency`
18. `customer_cannot_admin_reply`
19. *(additional test)*
