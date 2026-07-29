# RC5 Clickability Matrix

| Element                            | Handler                        | Status                |
| ---------------------------------- | ------------------------------ | --------------------- |
| Admin Meer directory rows          | navigate to `surface/[id]`     | PASS                  |
| Directory detail back              | router.back                    | PASS                  |
| Partner suspend/reactivate         | AAL2 step-up + RPC             | PASS                  |
| Finance commission approve/reject  | AAL2 step-up + RPC             | PASS                  |
| Ticket internal note toggle + send | FEATURE_DISABLED aware         | PASS                  |
| Partner apply type buttons         | set INDIVIDUAL/BUSINESS        | PASS                  |
| KYC / ID scan                      | unavailable copy (no fake CTA) | BLOCKED (provider)    |
| Payout process                     | disabled explained             | unavailable_explained |
| 5 admin tabs + leads under Meer    | href null                      | PASS                  |
| WhatsApp Meer                      | openConfiguredWhatsApp         | PASS                  |
| Logout                             | signOut + QueryClient clear    | PASS                  |

Rule: RC5-supported detail no longer shows “Nog niet beschikbaar”.
