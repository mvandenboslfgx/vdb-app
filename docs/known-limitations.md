# Known Limitations

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


| Area | Limitation |
|---|---|
| Remote schema | Mobile migrations not applied to production; local Supabase is the integration target |
| Demo mode | Allowed only with explicit `EXPO_PUBLIC_ENABLE_DEMO_MODE=true` in development/test — never silent fallback |
| Virus scan | Local test scan adapter only; production provider not configured |
| Partner payouts | Feature-flagged off (`partner_payouts=false`) |
| Digital goods checkout | Blocked by policy gate |
| Mollie | Fail-closed `FEATURE_NOT_CONFIGURED` without server test key |
| Edge functions | Local stubs; not deployed to remote |
| Admin RPCs | Some admin dashboard RPCs still incomplete |
| Android SDK / S25 | BLOCKED on this workstation — see `docs/windows-android-setup-exact.md` |
| Maestro | Flow YAML + syntax validation ready; device execution BLOCKED |
| EAS project ID | Placeholder — owner must run `eas login` / `eas init` |
| Offline | Read cache only; no offline writes for money flows |
| `admin_roles` shape | Helpers assume `user_id` column; confirm before remote apply |
