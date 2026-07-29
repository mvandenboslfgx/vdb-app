# Owner RC4 remaining blockers (Mobile handoff — no Owner edits)

Mobile Phase 1 does **not** change Owner code. This file is the exact handoff for the next scoped Owner task (after Partner type gap analysis returns).

Staging project: `qzekuvmgfekzsowdecyk`
Contract pin (Mobile): `vdb-backend-contract@0.2.0-rc.4`

---

## Directory detail RPCs

Day-1 Mobile lists exist via `admin_list_*`. Detail taps show **Nog niet beschikbaar** and are release blockers until Owner ships detail RPCs.

### Product detail

| Field                | Requirement                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| Screen               | Admin Meer → Producten → row detail                                        |
| Desired RPC          | `admin_get_product` (suggested; Owner may rename canonically)              |
| Input                | `p_product_id uuid`                                                        |
| Output shape         | `{ id, title, status, summary, price_cents?, currency?, updated_at, ... }` |
| Source object        | catalog / products domain (Owner canonical table)                          |
| Capability           | staff+ read                                                                |
| AAL                  | AAL1 read OK                                                               |
| Pagination / related | optional related packages/prices                                           |
| Error codes          | `NOT_FOUND`, `FORBIDDEN`, `AUTH_REQUIRED`                                  |
| Mobile mapper        | new `mapAdminProductDetail` + route `more/surface/products/[id]`           |
| Regression tests     | staff allow; customer deny; missing id NOT_FOUND                           |

### Partner detail

| Field                | Requirement                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| Screen               | Admin Meer → Partners → row detail (+ lifecycle actions already on list surface)     |
| Desired RPC          | `admin_get_partner`                                                                  |
| Input                | `p_partner_id uuid`                                                                  |
| Output shape         | `{ id, display_name, status, type?, email_masked?, created_at, suspended_at?, ... }` |
| Source object        | partner_profiles / Owner partner aggregate                                           |
| Capability           | staff+ read; mutations remain existing suspend/reactivate (AAL2)                     |
| AAL                  | read AAL1; mutations AAL2                                                            |
| Pagination / related | recent leads/commissions summary optional                                            |
| Error codes          | `NOT_FOUND`, `FORBIDDEN`, `AAL2_REQUIRED` (mutations only)                           |
| Mobile mapper        | `mapAdminPartnerDetail`                                                              |
| Regression tests     | PARTICULIER and ZAKELIJK partners both render without requiring KVK                  |
| Note                 | Partner type model is Owner-owned; Mobile must not invent enum                       |

### Customer detail

| Field         | Requirement                                                                   |
| ------------- | ----------------------------------------------------------------------------- |
| Screen        | Admin Meer → Klanten → detail                                                 |
| Desired RPC   | `admin_get_customer`                                                          |
| Input         | `p_organization_id` or `p_customer_user_id` (Owner chooses one canonical key) |
| Output shape  | `{ id, name, email_masked?, org_id, role, project_count?, ... }`              |
| Source object | organizations / members                                                       |
| Capability    | staff+ read                                                                   |
| AAL           | AAL1                                                                          |
| Related       | recent projects/tickets ids                                                   |
| Error codes   | `NOT_FOUND`, `FORBIDDEN`                                                      |
| Mobile mapper | `mapAdminCustomerDetail`                                                      |
| Tests         | cross-customer isolation                                                      |

### Project detail

| Field       | Requirement                                                 |
| ----------- | ----------------------------------------------------------- |
| Desired RPC | `admin_get_project`                                         |
| Input       | `p_project_id uuid`                                         |
| Output      | `{ id, name, status, org_id, customer_label?, updated_at }` |
| Capability  | staff+                                                      |
| AAL         | AAL1                                                        |
| Related     | quotes/invoices/appointments cursors                        |
| Errors      | `NOT_FOUND`, `FORBIDDEN`                                    |
| Mapper      | `mapAdminProjectDetail`                                     |

### Quote detail

| Field       | Requirement                                                           |
| ----------- | --------------------------------------------------------------------- |
| Desired RPC | `admin_get_quote`                                                     |
| Input       | `p_quote_id uuid`                                                     |
| Output      | `{ id, number, status, total_cents, currency, project_id, items[]? }` |
| Capability  | staff+                                                                |
| AAL         | AAL1                                                                  |
| Errors      | `NOT_FOUND`, `FORBIDDEN`                                              |
| Mapper      | `mapAdminQuoteDetail`                                                 |

### Invoice detail

| Field       | Requirement                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| Desired RPC | `admin_get_invoice`                                                          |
| Input       | `p_invoice_id uuid`                                                          |
| Output      | `{ id, number, status, amount_due_cents, paid_cents, currency, project_id }` |
| Capability  | staff+                                                                       |
| AAL         | AAL1                                                                         |
| Errors      | `NOT_FOUND`, `FORBIDDEN`                                                     |
| Mapper      | `mapAdminInvoiceDetail`                                                      |

### Appointment detail

| Field       | Requirement                                                                      |
| ----------- | -------------------------------------------------------------------------------- |
| Desired RPC | `admin_get_appointment`                                                          |
| Input       | `p_appointment_id uuid`                                                          |
| Output      | `{ id, starts_at, ends_at, status, project_id, location?, notes_customer_safe }` |
| Capability  | staff+                                                                           |
| AAL         | AAL1                                                                             |
| Errors      | `NOT_FOUND`, `FORBIDDEN`, `FEATURE_DISABLED` if booking flag closed              |
| Mapper      | `mapAdminAppointmentDetail`                                                      |

---

## Support internal notes

| Item                                        | Current state                                                                                                                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner flag                                  | `support_internal_notes_rpc` (fail-closed default **false**)                                                                                                                                                    |
| Current RPC                                 | `add_portal_support_internal_note`                                                                                                                                                                              |
| Contract status                             | Listed in rc.3/rc.4 messaging/support surface; flag-gated                                                                                                                                                       |
| Staging status (Phase 1 probe)              | RPC returns **`FEATURE_DISABLED`** for staff/admin/owner on staging                                                                                                                                             |
| Roles that may see internals (when enabled) | staff, admin, owner only                                                                                                                                                                                        |
| Roles that must never see                   | customer, partner (any status), anon                                                                                                                                                                            |
| Customer-visible replies                    | `reply_portal_support_ticket` / Mobile `admin_reply_support_ticket` mapping — remains available                                                                                                                 |
| Mobile behavior now                         | Internal toggle exists; FEATURE_DISABLED → explicit `internalNotesDisabled` copy; no silent success                                                                                                             |
| Required Owner change                       | Decide: (a) safely enable flag on staging then production, or (b) keep closed and document as non-day-1. Prefer flag enable only after Owner ACL proof — **not** a new parallel RPC unless security requires it |
| Change type                                 | Primarily **flag change** (+ contract/staging verification). New RPC only if current RPC cannot enforce staff-only isolation                                                                                    |

---

## Out of scope for this handoff

- Partner PARTICULIER vs ZAKELIJK canonical schema (separate Owner analysis in flight)
- Mobile APK / Play Store
- Production migrations from Mobile repo
