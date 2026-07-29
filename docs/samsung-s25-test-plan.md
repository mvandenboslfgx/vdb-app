# Samsung Galaxy S25 Test Plan

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

Physical device checklist for release candidates.

| #   | Area          | Steps                                     | Pass? |
| --- | ------------- | ----------------------------------------- | ----- |
| 1   | Install       | Install preview build via EAS             |       |
| 2   | Login         | Email login + session restore after kill  |       |
| 3   | Keyboard      | Forms not covered by IME; safe areas      |       |
| 4   | Edge-to-edge  | No clipped CTAs / nav                     |       |
| 5   | Notifications | Permission + receive test push            |       |
| 6   | Deep links    | `https://vdbdigital.nl/app/...` opens app |       |
| 7   | File picker   | Document upload                           |       |
| 8   | Download      | Open signed document URL                  |       |
| 9   | Biometrics    | System dialogs if enabled                 |       |
| 10  | Dark mode     | Brand contrast OK                         |       |
| 11  | Rotation      | Portrait lock or graceful layout          |       |
| 12  | Battery opt   | Background notification delivery          |       |
| 13  | Checkout      | Sandbox Mollie return deep link           |       |
| 14  | Partner link  | Attribution click → app/web               |       |

Record build number, OS version, and tester name for each RC.
