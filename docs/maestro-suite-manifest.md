# Maestro suite manifest

Generated: 2026-07-21T21:47:35.584Z

## Rule

Executable device flows are YAML files matching `^\d{2}-[a-z0-9-]+\.yaml$` directly under `maestro/`.

- Included: numbered hyphen flows (`01-customer-auth.yaml`, …).
- Excluded: `shared/*` helpers, `device-suite*.yaml` wrappers, legacy `NN_*.yaml` skeletons, `_probe*` files.

## Denominator

| Field | Value |
|---|---|
| Executable flows | **20** |
| Score label | **20/20 PASS** |
| Numbering gaps | 18 |

**Note:** Flow files jump from `17-…` to `19-…` (no `18-…`). Reporting “16–21” means file prefixes, not a count of 21 flows.

## Executable order

1. `01-customer-auth.yaml`
2. `02-project-request.yaml`
3. `03-project-chat.yaml`
4. `04-support-ticket.yaml`
5. `05-document-review.yaml`
6. `06-quote-acceptance.yaml`
7. `07-test-checkout.yaml`
8. `08-partner-application.yaml`
9. `09-admin-partner-approval.yaml`
10. `10-partner-lead.yaml`
11. `11-commission-payout.yaml`
12. `12-account-deletion.yaml`
13. `13-appointments.yaml`
14. `14-admin-project-creation.yaml`
15. `15-document-version-2.yaml`
16. `16-checkout-browser-return.yaml`
17. `17-customer-document-upload.yaml`
18. `19-partner-payout.yaml`
19. `20-admin-ticket-reply.yaml`
20. `21-admin-finance.yaml`

## Excluded

- `01_customer_register.yaml (legacy underscore skeleton)`
- `02_customer_login.yaml (legacy underscore skeleton)`
- `03_customer_project_request.yaml (legacy underscore skeleton)`
- `04_customer_open_project.yaml (legacy underscore skeleton)`
- `05_customer_send_message.yaml (legacy underscore skeleton)`
- `06_customer_upload_document.yaml (legacy underscore skeleton)`
- `07_customer_approve_document.yaml (legacy underscore skeleton)`
- `08_customer_accept_quote.yaml (legacy underscore skeleton)`
- `09_customer_open_checkout.yaml (legacy underscore skeleton)`
- `10_partner_apply.yaml (legacy underscore skeleton)`
- `11_admin_approve_partner.yaml (legacy underscore skeleton)`
- `12_partner_register_lead.yaml (legacy underscore skeleton)`
- `13_admin_confirm_sale.yaml (legacy underscore skeleton)`
- `14_payment_confirmed.yaml (legacy underscore skeleton)`
- `15_commission_approved.yaml (legacy underscore skeleton)`
- `16_partner_request_payout.yaml (legacy underscore skeleton)`
- `17_customer_support_ticket.yaml (legacy underscore skeleton)`
- `18_account_deletion_request.yaml (legacy underscore skeleton)`
- `device-suite-from-09.yaml (suite wrapper)`
- `device-suite-from-13.yaml (suite wrapper)`
- `device-suite-from-16.yaml (suite wrapper)`
- `device-suite.yaml (suite wrapper)`
- `shared/dismiss-overlays.yaml (helper)`
- `shared/login.yaml (helper)`

