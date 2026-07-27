# Backend contract (Mobile consumer)

**Repository role:** `MOBILE_CLIENT`
**Pinned package:** `vdb-backend-contract@0.2.0-rc.3`
**Pinned schemaVersion:** `2026.07.25.messaging-support-appointments-rc3`
**Status:** `CONSUMER_PIN_OWNER_RC3`
**Canonical publisher:** VDB Digital 2.0 only

## Explicit non-claims

- Mobile **`0.1.1` / `2026.07.24.remediation`** was a **local remediation proposal** only — **not** canonical, **not** for staging publish.
- Owner historical **`0.1.0` / `2026.07.22.freeze`** is freeze history only — **not** the shared staging target.

## Consumer rules

1. Pin exact owner `schemaVersion` before shared staging/preview builds (`2026.07.25.messaging-support-appointments-rc3` for RC3 freeze/staging).
2. Use `src/api/contract/ownerMapping.ts` for table/RPC name mapping to `portal_*` / `partner_*`.
3. Local `supabase/migrations/*` in this repo remain **NON-CANONICAL** isolated proof SQL.
4. Do not invent parallel base tables on shared staging.
5. Financial flags stay fail-closed until owner enables them.
6. Handle concurrency error codes `PARTNER_LEAD_ALREADY_CONVERTED` and `PARTNER_INSUFFICIENT_LIABILITY` on partner sale/payout paths.
7. `portal_conversations`, `portal_conversation_participants`, `portal_messages`, `portal_message_attachments`, `portal_support_tickets`, `portal_support_replies`, `portal_appointments`, and `portal_appointment_participants` are now live surfaces — see `src/api/repositories/messagesRepository.ts`, `supportRepository.ts`, `appointmentsRepository.ts`.
8. Customer message/reply reads must filter `is_internal = false` client-side as defense in depth, even though RLS already enforces this. Customer flows must never call internal-note RPCs.
9. `messaging_realtime`, `support_internal_notes_rpc` and `appointments_booking` remain fail-closed (`false`) until the owner enables them. Booking/cancel/reschedule must surface `FEATURE_DISABLED` as a `DomainError.configuration`, never crash. `availability_slots` does not exist in rc.3 — `listAvailableSlots()` always returns `[]`.

## Related

- Owner bundle: `vdbdigital2.0/contracts/releases/vdb-backend-contract-0.2.0-rc.3/`
- Owner convergence: `vdbdigital2.0/docs/contract-convergence-rc3.md`
- Mobile pin module: `src/config/backendContract.ts`
