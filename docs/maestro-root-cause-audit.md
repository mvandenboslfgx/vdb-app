# Maestro root-cause audit (Phase 7)

**Date:** 2026-07-21  
**Device evidence baseline:** 0/20 PASS (`docs/maestro-device-results.md`)  
**Classification:** selector / start-state / YAML — not native crashes.

## Summary of root causes (ranked)

1. **MISSING / WRONG TESTID** — Invented `nav-*`, `*-row-0`, chat/appointment aliases never shipped
2. **WRONG START STATE / AUTH STATE MISMATCH** — Flows `launchApp` without clearState or role login
3. **LANGUAGE MISMATCH** — EN tab strings vs default NL UI
4. **INVALID YAML** — Flow 16 comment as list item (`- # …`)
5. **DATA SEED / FEATURE GAPS** — Flow 14 no admin create-project UI; finance needs selection+reason

## Per-flow audit

| Flow | File | Start | Expected | Actual (device) | Selector | Present? | Lang? | Session? | Seed? | YAML? | Class | Fix |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | 01-customer-auth.yaml | launchApp | login | often dashboard/public | screen-auth-login, input-login-* | yes | no | **yes** | no | no | WRONG START STATE / AUTH | clearState + force login screen |
| 02 | 02-project-request.yaml | launchApp | project request | fail home | screen-customer-home, btn-project-request | **no** | — | yes | — | no | WRONG TESTID | dashboard + btn-projects-request + input-project-request-title |
| 03 | 03-project-chat.yaml | launchApp | chat | fail | nav-messages, conversation-row-0, input-chat-* | **no** | — | yes | — | no | MISSING TESTID | tab Berichten + real message IDs |
| 04 | 04-support-ticket.yaml | launchApp | support | fail | nav-support, screen-support-create | partial | — | yes | — | no | MISSING TESTID | Meer→Support + screen-support-new |
| 05 | 05-document-review.yaml | launchApp | doc | fail | nav-documents, document-row-0 | partial | — | yes | — | no | MISSING TESTID | Meer→Documenten + row IDs |
| 06 | 06-quote-acceptance.yaml | launchApp | quote | fail | nav-quotes, quote-row-0 | partial | — | yes | — | no | MISSING TESTID | Meer→offertes + row IDs |
| 07 | 07-test-checkout.yaml | launchApp | invoice | fail | nav-invoices, invoice-row-0 | partial | — | yes | — | no | MISSING TESTID | Meer→facturen + checkout |
| 08 | 08-partner-application.yaml | launchApp | apply | fail | nav-partner-apply | partial | — | yes | — | no | MISSING TESTID | Meer→partner apply + form fields |
| 09 | 09-admin-partner-approval.yaml | launchApp | admin | fail | nav-admin, btn-admin-approve-partner | **no** | — | yes | — | no | WRONG TESTID | admin login + approval-row/btn-approve-* |
| 10 | 10-partner-lead.yaml | launchApp | leads | fail | text Leads + lead IDs | IDs yes | EN ok | **yes** | — | no | AUTH STATE MISMATCH | partner login first |
| 11 | 11-commission-payout.yaml | launchApp | commissions | fail | nav-partner-commissions | **no** | — | yes | — | no | MISSING TESTID | use flow 19 IDs / Commissies |
| 12 | 12-account-deletion.yaml | launchApp | deletion | fail | nav-account, btn-account-delete-* | partial | — | yes | — | no | WRONG TESTID | Meer→Account verwijderen + real IDs |
| 13 | 13-appointments.yaml | launchApp | appointments | fail | nav-appointments, btn-appointment-* | partial | — | yes | seed | no | WRONG TESTID | btn-appointments-book, slot-row-{uuid} |
| 14 | 14-admin-project-creation.yaml | launchApp | create project | fail | admin-queue-project-0 | **no** | — | yes | — | no | NAVIGATION MISMATCH / feature gap | implement or rewrite to existing admin path |
| 15 | 15-document-version-2.yaml | launchApp | request changes | fail | same as 05 | partial | — | yes | seed | no | MISSING TESTID | same nav as 05 + comment IDs |
| 16 | 16-checkout-browser-return.yaml | launchApp | checkout | **parse fail** | nav-invoices + `- # comment` | — | — | — | — | **yes** | INVALID YAML | remove `-` before comment; then same as 07 |
| 17 | 17-customer-document-upload.yaml | launchApp | upload | fail | text Documents | IDs yes | **yes** | yes | — | no | LANGUAGE MISMATCH | text Documenten / testIDs |
| 19 | 19-partner-payout.yaml | launchApp | payout | fail | text Commissions | IDs yes | **yes** | yes | seed | no | LANGUAGE MISMATCH | Commissies + payout screen |
| 20 | 20-admin-ticket-reply.yaml | launchApp | ticket | fail | text Tickets | IDs yes | no | **yes** | seed | no | AUTH STATE MISMATCH | admin login |
| 21 | 21-admin-finance.yaml | launchApp | finance | fail | text Finance | IDs yes | **yes** | yes | seed | no | LANGUAGE MISMATCH + WRONG START | Financiën + select row before approve |

## Fixes applied (Phase 7 — in progress)

| Area | Change |
|---|---|
| Credentials | Password `LocalTestVdb2026` (no `!`) in seed + Maestro + docs |
| Start state | Every flow: `clearState` + `shared/login.yaml` with role EMAIL |
| Selectors | Tab `tabBarButtonTestID`s; auth/customer/partner/admin testIDs; `*-row-0` fixtures |
| YAML 16 | Parse fixed (no `- #` list comment) |
| Flow 14 | Rewritten to admin approvals queue (no invent create-project UI) |
| Overlays | `shared/dismiss-overlays.yaml` for Samsung Pass / autofill |
| Harness | `npm run device:test:{prepare,reset,seed,customer,partner,admin,maestro}` |
| Typecheck | `resolveHomeRoute(): Href`; TextInput blur typing fixed |

## Remaining for 20/20 device PASS

Reconnect S25, `npm run device:test:reset`, Metro + reverse, `npm run device:test:maestro`, then fix any REAL APP DEFECT / TIMING failures without arbitrary sleeps.
