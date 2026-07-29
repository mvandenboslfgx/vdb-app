# RC5 Internal Notes Matrix

| Check                             | Expected                             | Observed                                               |
| --------------------------------- | ------------------------------------ | ------------------------------------------------------ |
| Writer                            | `add_portal_support_internal_note`   | Wired in admin ticket detail                           |
| Reader                            | `list_portal_support_ticket_replies` | Staff uses `listStaffTicketMessages`                   |
| Customer reader                   | same RPC; server filters internals   | `listMessages` drops `is_internal` as defense in depth |
| Staging write (staff/admin/owner) | success or FEATURE_DISABLED          | PASS (created on staging)                              |
| Customer/Partner/anon deny        | FORBIDDEN / grant deny               | PASS in staging matrix                                 |
| Visual mark                       | Internal bubble gold label           | Existing admin ticket UI                               |
| Production flag                   | false — no production action         | Documented; FEATURE_DISABLED = hide feature            |

S4 residual: production remains fail-closed by design (Owner).
