# Known Limitations

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


| Area | Limitation |
|---|---|
| Remote schema | Mobile migrations not applied; app must tolerate missing tables via repository interfaces |
| Virus scan | Flag off by default; not production-complete without provider |
| Partner payouts | Feature-flagged off |
| Digital goods checkout | Blocked by policy gate |
| Edge functions | Stubs return 501; not deployed |
| Admin on mobile | Staff tools limited; web admin remains primary |
| Offline | Read cache only; no offline writes for money flows |
| `admin_roles` shape | Helpers assume `user_id` column; confirm before remote apply |
