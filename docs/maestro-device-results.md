# Maestro device results

**Date:** 2026-07-21  
**Runner:** Maestro CLI 2.7.0 (`C:\Users\XXX\maestro\bin\maestro.bat`)  
**Device:** `R3GYC00EBYY` (Samsung S25)  
**Syntax:** `npm run test:maestro:syntax` still validates structure separately.

## Summary

| Metric | Value |
|---:|
| Flows executed | 20 |
| PASS | 0 |
| FAIL | 20 |
| BLOCKED | 0 |

All twenty required flows were **actually executed on device** (not syntax-only). Failures are primarily missing/mismatched testIDs and one YAML parse error — not proof of app native crashes.

## Per flow

| Flow | Result | Duration (s) | Opmerking |
|---|---|---:|---|
| 01-customer-auth | FAIL | 62.5 | `screen-auth-login` not visible (wrong start screen / session) |
| 02-project-request | FAIL | 51.6 | `screen-customer-home` not found |
| 03-project-chat | FAIL | 49.0 | `nav-messages` not found |
| 04-support-ticket | FAIL | 48.5 | `nav-support` not found |
| 05-document-review | FAIL | 40.5 | `nav-documents` not found |
| 06-quote-acceptance | FAIL | 40.2 | `nav-quotes` not found |
| 07-test-checkout | FAIL | 29.8 | `nav-invoices` not found |
| 08-partner-application | FAIL | 39.8 | `nav-partner-appl…` not found |
| 09-admin-partner-approval | FAIL | 30.8 | `nav-admin` not found |
| 10-partner-lead | FAIL | 42.1 | text `Leads` not found |
| 11-commission-payout | FAIL | 29.6 | `nav-partner-comm…` not found |
| 12-account-deletion | FAIL | 40.0 | `nav-account` not found |
| 13-appointments | FAIL | 41.2 | `nav-appointments` not found |
| 14-admin-project-creation | FAIL | 31.9 | `nav-admin` not found |
| 15-document-version-2 | FAIL | 50.2 | `nav-documents` not found |
| 16-checkout-browser-return | FAIL | 4.0 | **YAML parse failed** |
| 17-customer-document-upload | FAIL | 41.2 | text `Documents` not found |
| 19-partner-payout | FAIL | 44.6 | text `Commissions` not found |
| 20-admin-ticket-reply | FAIL | 62.7 | text `Tickets` not found |
| 21-admin-finance | FAIL | 53.4 | text `Finance` not found |

## Follow-up

Rewrite Maestro flows to match real testIDs (`screen-customer-dashboard`, `btn-login-submit`, tab labels NL, etc.) and ensure logged-out start state + local seed credentials.
