# RC5 Directory Detail Matrix

| Surface   | List RPC                  | Detail RPC              | Mobile route                              | Status                        |
| --------- | ------------------------- | ----------------------- | ----------------------------------------- | ----------------------------- |
| Producten | `admin_list_products`     | `admin_get_product`     | `/(admin)/more/surface/products/[id]`     | PASS                          |
| Partners  | `admin_list_partners`     | `admin_get_partner`     | `/(admin)/more/surface/partners/[id]`     | PASS (+ activation checklist) |
| Klanten   | `admin_list_customers`    | `admin_get_customer`    | `/(admin)/more/surface/customers/[id]`    | PASS                          |
| Projecten | `admin_list_projects`     | `admin_get_project`     | `/(admin)/more/surface/projects/[id]`     | PASS                          |
| Offertes  | `admin_list_quotes`       | `admin_get_quote`       | `/(admin)/more/surface/quotes/[id]`       | PASS                          |
| Facturen  | `admin_list_invoices`     | `admin_get_invoice`     | `/(admin)/more/surface/invoices/[id]`     | PASS                          |
| Afspraken | `admin_list_appointments` | `admin_get_appointment` | `/(admin)/more/surface/appointments/[id]` | PASS                          |

schemaVersion asserted: `2026.07.29.partner-identity-directory-rc5`

States: loading / success / NOT_FOUND empty / FORBIDDEN / retry / contract drift.

S3 (directory detail missing) is **closed** for these seven surfaces.
