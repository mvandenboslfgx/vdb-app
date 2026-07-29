# Definitieve eigenaarsbesluiten — device remediation

**Date:** 2026-07-29
**Baseline HEAD:** `41f3378c60c1fa80f7c0a6202551d1731708134a`
**Branch:** `fix/a5-owner-contract-runtime`
**Package:** `nl.vdbdigital.app` · versionCode `2`
**Device:** Samsung S25 `SM-S931B` / Android 16
**Store submit:** not authorized

**Gate verdict (until Owner RPCs + owner S25 acceptance):**

```text
RC3 MOBILE DEVICE REMEDIATION BLOCKED
```

---

## Q1 — Admin backend

**Decision:** `A — canonieke Owner-RPC’s`

- No legacy tables, no out-of-contract Mobile reads, no service-role, no mocks, no client aggregation as auth.
- Missing surfaces → Owner handoff + Mobile fail-closed.
- See `OWNER_ADMIN_RPC_HANDOFF.md`.

## Q2 — WhatsApp number

**Canonical digits:** `31628600727` (= 06 28 60 07 27)

- Digits only, NL country code 31, no leading 0 / spaces / dashes / plus in stored value.

## Q3 — WhatsApp message

| Locale | Template                                                        |
| ------ | --------------------------------------------------------------- |
| NL     | `Hallo VDB Digital, ik heb een vraag via de VDB Digital-app.`   |
| EN     | `Hello VDB Digital, I have a question via the VDB Digital app.` |

No automatic PII (name, email, phone, IDs, project/quote/invoice, tokens, session).

## Q4 — Admin day-1 scope

**Decision:** `B — read én bedoelde veilige mutaties`

- Day-1 includes dashboard, approvals, tickets, leads, products, partners, customers, projects, quotes, invoices, support, appointments, finance status, commission approve/reject, partner suspend/reactivate, necessary product/account status changes, settings, security.
- **Payout processing remains disabled** until separately authorized.
- Visible control without safe backend → non-interactive `Nog niet beschikbaar` + explanation.

## Q5 — WhatsApp placement

Available under Meer/Instellingen for:

- Customer
- Partner
- Admin/Owner

Not a primary bottom tab.

## Admin navigation (final)

Primary (max 5): Home · Goedkeuringen · Tickets · Financiën · Meer

Meer: Leads, Producten, Partners, Klanten, Projecten, Offertes, Facturen, Afspraken, Instellingen, WhatsApp/contact, Beveiliging, Uitloggen

## Prior PASS

Withdrawn. Do not reuse `RC3 MOBILE PRODUCTION BUILD AND INTERNAL VALIDATION PASS`.
