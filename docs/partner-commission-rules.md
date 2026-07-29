# Partner Commission Rules

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

## Eligibility (all must be true)

1. Sale attributed to a valid active partner
2. Customer payment received by VDB
3. Payment status confirmed server-side (`paid`)
4. Sale reviewed by VDB
5. Refund / cancel / fraud hold window elapsed (`hold_until`)
6. Staff (or approved automation) releases commission

## Status machine

| Status             | Meaning                           |
| ------------------ | --------------------------------- |
| `pending`          | Attribution recorded              |
| `awaiting_payment` | Waiting for customer payment      |
| `payment_received` | Mollie confirmed paid             |
| `under_review`     | Staff review                      |
| `approved`         | Approved amount locked            |
| `payable`          | Eligible for payout batch         |
| `payout_requested` | Partner requested payout          |
| `paid`             | Payout completed                  |
| `rejected`         | Not payable                       |
| `reversed`         | Clawback after prior approval/pay |

Every transition writes `commission_events` + `audit_logs`.

## Partner prohibitions

Partners may **not**:

- Collect customer funds
- Change commission amounts
- Approve commissions
- Mark payments received
- Alter payment statuses

## Payouts

Controlled by feature flag `partner_payouts` (default **off**; legacy alias `partner.payouts` accepted in RPCs).
Partners manage `payout_accounts` (IBAN stored encrypted server-side) and submit `payout_requests`.
