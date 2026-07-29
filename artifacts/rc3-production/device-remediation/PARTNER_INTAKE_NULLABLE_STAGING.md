# Partner intake nullable staging probe

At: 2026-07-29T04:08:07.642Z
Staging: qzekuvmgfekzsowdecyk
RPC: `submit_partner_application`

Result: **PASS** — null `trade_name` / `kvk_number` accepted
Application id present: yes
Application status: `SUBMITTED`
Profile status: `PENDING`
trade_name null: PASS
kvk_number null: PASS
Not auto-ACTIVE: PASS

Hard boundaries confirmed:

- No Mobile type enum inferred
- No ACTIVE sales/lead/commission/payout grant from intake alone
- S6 remains open until Owner PARTICULIER/ZAKELIJK model ships
