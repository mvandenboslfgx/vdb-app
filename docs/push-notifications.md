# Push Notifications

> **NOT IN v1 — FUTURE DESIGN.** This document describes the intended push
> architecture, not shipped behaviour. The mobile client deliberately contains
> no push code: `expo-notifications` is not a dependency, no token is
> registered, and the build requests no notification permission. Play Data
> Safety must therefore declare push tokens as **not collected**
> (`docs/store/data-safety-draft.md`). Re-adding push means re-adding the
> dependency and plugin, the permission justification, and the Data Safety row
> together — never one without the others.
>
> The `pushNotifications` feature flag stays in the shared contract for the web
> clients; on mobile it grants no capability, so UI must not gate delivery
> copy on it.

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.

## Components

| Table                     | Purpose                     |
| ------------------------- | --------------------------- |
| `push_tokens`             | Device tokens per user      |
| `notifications`           | In-app notification records |
| `notification_deliveries` | Per-channel send attempts   |

## Triggers (examples)

- Project status changed
- New message / support reply
- Document ready for review
- Quote sent / invoice issued
- Payment status updated
- Commission status changed
- Appointment reminders

## Delivery

Edge function `send-notification` (stub) uses service role:

1. Insert `notifications`
2. Resolve active `push_tokens`
3. Send via provider (FCM/Expo)
4. Log `notification_deliveries` status

## Client duties

- Register token after login / permission grant
- Refresh `last_seen_at`
- Mark notifications read locally + sync `read_at`
