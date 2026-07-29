# Backend contract (Mobile consumer)

**Repository role:** `MOBILE_CLIENT`
**Pinned package:** `vdb-backend-contract@0.2.0-rc.6`
**Pinned schemaVersion:** `2026.07.29.partner-approval-aal2-rc6`
**Status:** `CONSUMER_PIN_OWNER_RC6`
**Canonical publisher:** VDB Digital 2.0 only
**Owner baseline commit:** `ccdeb8455696bf4381f2e6805e57e41aa3e51ca4`

## Explicit non-claims

- Superseded pins (`0.2.0-rc.5`, `0.2.0-rc.4`, `0.2.0-rc.3`, and older) are **history only** — **not** live fallback. Runtime asserts the RC6 `schemaVersion` and fails closed on drift.
- Mobile **`0.1.1` / `2026.07.24.remediation`** was a **local remediation proposal** only — **not** canonical, **not** for staging publish.
- Owner historical **`0.1.0` / `2026.07.22.freeze`** is freeze history only — **not** the shared staging target.

## Consumer rules

1. Pin exact owner `schemaVersion` before shared staging/preview builds (`2026.07.29.partner-approval-aal2-rc6` for RC6).
2. Use `src/api/contract/ownerMapping.ts` for table/RPC name mapping to `portal_*` / `partner_*`.
3. Local `supabase/migrations/*` in this repo remain **NON-CANONICAL** isolated proof SQL.
4. Do not invent parallel base tables on shared staging.
5. Financial flags stay fail-closed until owner enables them. **Payout UI/features stay disabled.**
6. Handle concurrency error codes `PARTNER_LEAD_ALREADY_CONVERTED` and `PARTNER_INSUFFICIENT_LIABILITY` on partner sale/payout paths.
7. Treat `approve_partner_application` / `reject_partner_application` (Owner `review_partner_application`) as AAL2 step-up actions. Expect `AAL2_REQUIRED` at AAL1; complete MFA before retry.
8. Staff approval alone never activates a partner — read `partner_activation_checklist` after approve when status remains `PENDING`.
9. `messaging_realtime`, `support_internal_notes_rpc`, `appointments_booking`, and `partner_payouts` remain fail-closed (`false`) until the owner enables them.

## Related

- Vendored Owner bundle: `contracts/releases/vdb-backend-contract-0.2.0-rc.6/`
- Consumer pin JSON: `contracts/backend-contract.json`
- Mobile pin module: `src/config/backendContract.ts`
- Provenance: `artifacts/rc6-contract-pin/PROVENANCE.md`
