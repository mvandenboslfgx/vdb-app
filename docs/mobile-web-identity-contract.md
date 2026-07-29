# Mobile ↔ Web identity contract

## Goal

Website and Android app share **one Supabase Auth identity**.

## Guarantees

| Concern            | Contract                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Account            | Same `auth.users` / `profiles` row                                                                                |
| Session            | JWT from Supabase Auth; app stores via SecureStore + PKCE                                                         |
| Roles              | Elevated: `admin_roles` (server-managed). App roles: `user_roles` (customer / partner_pending / partner / staff…) |
| Registration       | Public signup → `customer` only (or partner_application pending). Never client-assigned admin                     |
| Email verification | Required before privileged actions where product rules demand it                                                  |
| Password reset     | Shared deep links under `https://vdbdigital.nl/app/...` + custom scheme `vdbdigital://`                           |

## Client may never

- Insert into `admin_roles`
- Self-assign `admin` / `owner` / `staff` via `user_roles`
- Mark payments paid
- Approve commissions / payouts
- Read another user’s private rows (RLS)

## Server must

- Re-check role on every privileged Edge Function
- Write audit logs for financial and role changes
- Prefer service role only inside Edge Functions / trusted backends

## Demo mode

Demo identities (`demo-customer-*`) exist only when `EXPO_PUBLIC_ENABLE_DEMO_MODE=true` and `APP_ENV` is `development` or `test`. They must not appear in preview/production builds.
