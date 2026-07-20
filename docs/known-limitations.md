# Known Limitations

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


| Area | Limitation |
|---|---|
| Remote schema | Mobile migrations not applied to production; local Supabase is the integration target |
| Demo mode | Explicit flag only — never silent fallback |
| Partner leads | Repository/UI exist; dedicated leads table provisioning still incomplete for some paths |
| Admin ticket/finance actions | Dashboard + partner approvals work; ticket reply / finance mark-reviewed UI incomplete |
| Document customer upload | Review + signed URL work; full customer upload UX still limited |
| Virus scan | Local `mark_document_scan_clean` staff helper only |
| Partner payouts | Feature-flagged off |
| Mollie | Fail-closed without server test key; checkout return deep link prepared |
| Push delivery | Preferences UI ready; external delivery BLOCKED without credentials |
| Edge functions | Local stubs; not deployed to remote |
| Android SDK / S25 | BLOCKED — see `docs/windows-android-setup-exact.md` |
| Maestro | 16 flows syntax-validated; device execution BLOCKED |
| EAS project ID | Placeholder — owner must run `eas login` / `eas init` |
