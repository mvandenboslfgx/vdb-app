# RC5 STAGING APK READINESS — CLICKABILITY AUTOMATION

**Date:** 2026-07-29  
**Test file:** `__tests__/unit/rc5ClickabilityAutomation.test.ts`  
**Tests:** 68 (all PASS)

## Scope

Isolated unit-level test suite verifying that every primary interactive surface has:

- a handler / route target defined (no silent dead ends)
- correct capability gating per role
- fail-closed behaviour for missing providers / disabled features
- correct loading/disabled state contracts where applicable

## Coverage per area

### Customer role

| Check | Result |
|---|---|
| Home route resolves to `/(customer)` | PASS |
| Cannot access admin area | PASS |
| Cannot access partner area | PASS |
| Not staff / admin / partner / pending | PASS |

### Partner pending role

| Check | Result |
|---|---|
| Resolves to customer area (not partner) | PASS |
| `isPartnerPending` true | PASS |
| `isPartner` false | PASS |

### Partner role

| Check | Result |
|---|---|
| Home route resolves to `/(partner)` | PASS |
| Cannot access admin area | PASS |
| Can access partner area | PASS |
| Not admin / staff / pending | PASS |

### Admin / Owner roles

| Check | Result |
|---|---|
| Both resolve to `/(admin)` | PASS |
| Can access admin and partner area | PASS |

### Staff role

| Check | Result |
|---|---|
| Resolves to admin area | PASS |
| `isStaff` true, `isAdmin` false | PASS |

### Unauthenticated

| Check | Result |
|---|---|
| Empty roles resolve to `/(public)` | PASS |
| No admin/partner access | PASS |

### Route uniqueness

| Check | Result |
|---|---|
| All four primary area hrefs are distinct and non-empty | PASS |

### Deep link handler coverage

| URL | Result |
|---|---|
| `/app/projects/abc` | PASS (type: project) |
| `/app/quotes/q-1` | PASS (type: quote) |
| `/app/invoices/i-1` | PASS (type: invoice) |
| `/app/documents/doc-1` | PASS (type: document) |
| `/app/payments/return?invoiceId=…` | PASS (type: paymentReturn) |
| `evil.example/app/admin` | PASS (type: unknown — rejected) |
| `exp://localhost:8081/admin` | PASS (type: unknown — rejected) |
| `myapp://admin/commissions` | PASS (type: unknown — rejected) |

Note: `/app/appointments` is not registered as a deep-link route — accessible via dashboard only (not a defect).

### Admin five primary tabs

| Tab | Route | Result |
|---|---|---|
| Home | `/(admin)` | PASS |
| Goedkeuringen | `/(admin)/approvals` | PASS |
| Tickets | `/(admin)/tickets` | PASS |
| Financiën | `/(admin)/finance` | PASS |
| Meer | `/(admin)/more` | PASS |

### Admin Meer directory surfaces

All 10 surfaces (leads, products, partners, customers, projects, quotes, invoices, appointments, settings, security) verified as lowercase unique slugs accessible only to admin/owner roles. PASS.

### Suspended partner fail-closed

| Check | Result |
|---|---|
| Suspended effective roles grant no partner access | PASS |
| Suspended effective roles grant no admin access | PASS |
| Payout feature flag is disabled | PASS |

### WhatsApp CTA

| Check | Result |
|---|---|
| Canonical number is `31628600727` | PASS |
| URL contains no PII (email/password/token/session) | PASS |

### Logout / cache isolation

| Check | Result |
|---|---|
| Logout resolves to `/(public)` | PASS |
| `resolveHomeRoute([])` never contains admin or partner | PASS |

### AAL2 step-up surface

| Check | Result |
|---|---|
| Only ADMIN_ROLES can trigger AAL2-gated actions | PASS |
| `getAal2Status` exported | PASS |
| `challengeAndVerifyTotp` exported | PASS |
| `runSensitiveActionWithAal2` exported | PASS |
| `enrollTotp` NOT exported (Mobile does not enroll) | PASS |

### ALL_ROLES coverage

All 6 defined roles (`customer`, `partner_pending`, `partner`, `staff`, `admin`, `owner`) produce a valid non-empty Expo Href. PASS.

## Verdict

**CLICKABILITY AUTOMATION: PASS — 68/68 tests**
