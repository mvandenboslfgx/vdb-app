# Consumer verification — vdb-backend-contract@0.2.0-rc.6

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.6
VDB_SCHEMA_VERSION=2026.07.29.partner-approval-aal2-rc6
```

schemaVersion: `2026.07.29.partner-approval-aal2-rc6`

## Bundle integrity

1. Confirm `manifest.json` → `schemaVersion` equals the value above.
2. Compare every file's SHA256 to `checksums.json`.
3. Recompute `BUNDLE_SHA256.txt` as `sha256("<name>:<sha256>\n" joined over all other
   bundle files sorted by name, with a trailing newline)`.
4. Confirm every RPC name in `rpcs.json` exists on the target environment.
5. Confirm `SELECT * FROM public.verify_partner_approval_aal2_rc6_contracts()
   WHERE ok = false` returns zero rows.
6. Confirm rc.5 verifier still returns zero failing rows for the unchanged identity surface:
   `SELECT * FROM public.verify_partner_identity_directory_rc5_contracts() WHERE ok = false`
   (security-status stamp check may fail after rc.6 stamp bump — use the rc.6 verifier for
   the security stamp; rc.5 detail RPC stamps remain valid).

## Mobile must

1. Pin the contract and schemaVersion above when consuming the AAL2 review gate.
2. Treat `approve_partner_application` / `reject_partner_application` as AAL2 step-up actions.
   Expect `AAL2_REQUIRED` at AAL1; complete MFA challenge/verify before retrying.
3. Stop treating application approval as activation. After a successful AAL2 approve the
   partner may still be `PENDING`. Read `partner_activation_checklist` and render `missing[]`.
4. Keep all other rc.5 consumer rules (typed submit, no self-activation, directory detail
   allowlist, payout UI disabled, no staging fixture RPC from clients).

Owner does not modify the Mobile repository in this gate.
