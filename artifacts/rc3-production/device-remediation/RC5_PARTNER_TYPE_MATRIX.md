# RC5 Partner Type Matrix

Canonical types: `INDIVIDUAL` (Particulier) · `BUSINESS` (Zakelijk)

Legacy map: `particular`→INDIVIDUAL · `sole_trader`→BUSINESS · `company`→BUSINESS

| Check                                           | Result                                              |
| ----------------------------------------------- | --------------------------------------------------- |
| Explicit type choice in apply UI                | PASS                                                |
| INDIVIDUAL without company/KVK                  | PASS (schema + staging intake)                      |
| INDIVIDUAL + KVK rejected                       | PASS (client schema)                                |
| BUSINESS requires company+KVK                   | PASS                                                |
| No type inference from KVK/company/display_name | PASS                                                |
| Intake leaves profile non-ACTIVE                | PASS (staging)                                      |
| Null partner_type rendered as unclassified      | PASS (mapper)                                       |
| Public consumer onboarding / KYC                | **BLOCKED** — no provider; KYC CTA unavailable copy |

S6: Owner type model is now consumed; remaining open items are KYC/legal/fiscal/public onboarding — see `RC5_OPEN_BLOCKERS.md`.
