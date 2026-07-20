# Push Notifications

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


## Components

| Table | Purpose |
|---|---|
| `push_tokens` | Device tokens per user |
| `notifications` | In-app notification records |
| `notification_deliveries` | Per-channel send attempts |

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
