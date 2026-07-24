# Backend contract (Mobile consumer)

**Repository role:** `MOBILE_CLIENT`
**Pinned package:** `vdb-backend-contract@0.2.0-rc.2`
**Pinned schemaVersion:** `2026.07.24.mobile-compat-rc2`
**Status:** `CONSUMER_PIN_OWNER_RC2`
**Canonical publisher:** VDB Digital 2.0 only

## Explicit non-claims

- Mobile **`0.1.1` / `2026.07.24.remediation`** was a **local remediation proposal** only — **not** canonical, **not** for staging publish.
- Owner historical **`0.1.0` / `2026.07.22.freeze`** is freeze history only — **not** the shared staging target.

## Consumer rules

1. Pin exact owner `schemaVersion` before shared staging/preview builds.
2. Use `src/api/contract/ownerMapping.ts` for table/RPC name mapping to `portal_*` / `partner_*`.
3. Local `supabase/migrations/*` in this repo remain **NON-CANONICAL** isolated proof SQL.
4. Do not invent parallel base tables on shared staging.
5. Financial flags stay fail-closed until owner enables them.

## Related

- Owner bundle: `vdbdigital2.0/contracts/releases/vdb-backend-contract-0.2.0-rc.2/`
- Owner convergence: `vdbdigital2.0/docs/contract-convergence-rc2.md`
- Mobile pin module: `src/config/backendContract.ts`
