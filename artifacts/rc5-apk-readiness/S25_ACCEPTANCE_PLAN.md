# RC5 STAGING APK READINESS — S25 ACCEPTANCE PLAN

**Device:** Samsung Galaxy S25  
**Build:** Internal staging APK (preview profile, versionCode 3)  
**Date:** 2026-07-29

Legend: **A** = Automated | **M** = Manual (owner) | **B** = BLOCKED until production/KYC/legal

---

## General checks

| Check | Type | Notes |
|---|---|---|
| Package ID: `nl.vdbdigital.app` | A | Confirmed in `app.config.ts` |
| versionCode 3 installs over code 2 | M | Verify adb install / side-load |
| Non-debuggable build | A | EAS preview profile: release mode |
| Staging ref `qzekuvmgfekzsowdecyk` bound | A | `assertSupabaseProjectRefForAppEnv` |
| Login (email/password) | M | Fresh account on staging |
| Session restore after app restart | M | Background/foreground |
| Logout wipes session + cache | M | Confirm no data visible after logout |
| Account switch (customer → different account) | M | Confirm no data leak |
| Offline / reconnect behaviour | M | Airplane mode → reconnect |
| Retry on network error | M | Kill connection mid-request |
| NL language | M | Device locale NL |
| EN language | M | Device locale EN |
| WhatsApp button opens chat (`31628600727`) | M | Press CTA → WhatsApp |
| No crash on startup | M | Fresh launch |
| No truncated labels | M | Scroll all screens |
| No dead buttons (no handler) | A + M | Clickability tests + visual check |

---

## Customer flow

| Check | Type |
|---|---|
| Dashboard loads (projects / quotes / invoices) | M |
| Project list → project detail | M |
| Quote list → quote detail | M |
| Invoice list → invoice detail | M |
| Document list → document detail | M |
| Document upload | M |
| Message thread list → thread detail | M |
| Send message | M |
| Appointment list | M |
| Book appointment | M |
| Support ticket list → ticket detail | M |
| Create support ticket | M |
| Settings / account | M |
| Partner apply CTA visible | M |
| WhatsApp CTA | M |
| Logout | M |

---

## Partner flow

### Pending individual

| Check | Type |
|---|---|
| Dashboard shows pending state | M |
| Activation checklist visible | M |
| Catalog / leads / sales / commissions: fail-closed | M |
| KYC provider unavailable: fail-closed | B |
| Payout: fail-closed | A + M |
| WhatsApp CTA | M |
| Logout | M |

### Pending business

| Check | Type |
|---|---|
| Same as pending individual + KVK field visible | M |

### Active partner

| Check | Type |
|---|---|
| Dashboard shows active state | M |
| Catalog list | M |
| Lead list → lead detail | M |
| Create lead | M |
| Sales / commissions list | M |
| Support ticket | M |
| Payout: fail-closed (feature flag) | A |
| WhatsApp CTA | M |
| Logout | M |

### Suspended partner

| Check | Type |
|---|---|
| Dashboard shows suspended state | M |
| Catalog / leads / sales / commissions: all fail-closed | A (unit) + M |
| Payout: fail-closed | A |
| Admin routes: denied | A |
| Internal notes: not visible | A |
| Logout wipes session | A (unit) + M |
| Re-login remains suspended | A (unit) + M |

---

## Admin / Owner flow

### Five primary tabs

| Tab | Check | Type |
|---|---|---|
| Home | Dashboard loads | M |
| Goedkeuringen | Partner approval list | M |
| Goedkeuringen | Approve / reject action | M |
| Tickets | Ticket list | M |
| Tickets | Ticket detail + public reply | M |
| Tickets | Internal note visible (admin) | M |
| Tickets | Internal note NOT visible (customer) | A |
| Financiën | Commission list | M |
| Financiën | Commission approve | M |
| Meer | Directory tabs visible | M |

### Meer directory surfaces

| Surface | Check | Type |
|---|---|---|
| Leads | List + detail | M |
| Producten | List + detail | M |
| Partners | List + detail | M |
| Klanten | List + detail | M |
| Projecten | List + detail | M |
| Offertes | List + detail | M |
| Facturen | List + detail | M |
| Afspraken | List + detail | M |
| Instellingen | Opens | M |
| Security | Opens | M |
| WhatsApp | CTA works | M |

### Sensitive actions / AAL2

| Check | Type |
|---|---|
| Commission approve: AAL1 only (if allowed) | M |
| Commission reject: triggers AAL2 step-up modal | M |
| AAL1 → TOTP challenge modal appears | M |
| Enter correct TOTP → AAL2 | M |
| One-shot resume: action runs exactly once | M |
| Cancel step-up: action NOT run | A (unit) + M |
| Error in TOTP: action NOT run (fail-closed) | A (unit) + M |
| Double-tap: second tap blocked (one-shot) | A (unit) + M |
| Suspend partner: triggers AAL2 | M |
| Reactivate partner: triggers AAL2 | M |
| Payout: disabled (feature flag) | A + M |
| Back navigation from AAL2 modal | M |

---

## BLOCKED items (not testable in this gate)

| Item | Blocker |
|---|---|
| KYC provider live | BLOCKED — legal/commercial |
| Public partner onboarding live | BLOCKED — marketing/legal |
| Checkout / Mollie live | BLOCKED — commercial |
| Payout execution | BLOCKED — feature flag disabled |
| Production APK | BLOCKED — RC5 not in production |
| Play Store submit | BLOCKED — not authorized |

---

## Notes

- Phone stays disconnected until this gate returns PASS.
- versionCode bumped to 3 only in the actual EAS build step.
- No OTA, no AAB, no production deployment in this gate.
