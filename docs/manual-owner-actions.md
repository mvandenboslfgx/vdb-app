# Manual owner actions — Matthijs

Ordered checklist of actions that **only the owner / release engineer** can complete.
The coding agent must not perform these without explicit approval.

> Backend remote migrations remain **NOT APPLIED**.

## 1. Secrets & environments

1. [ ] Create local `.env` from `.env.example` (never commit real values); keep `EXPO_PUBLIC_ENABLE_DEMO_MODE=false` for real local Supabase
2. [ ] Confirm website Supabase project ref is exactly `nhsrdnjfsxfikfbdmdfj` (dashboard only — do not paste keys)
3. [ ] Add `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` to EAS Secrets for development / preview / production
4. [ ] Store `SUPABASE_SERVICE_ROLE_KEY` server-side only (Edge Functions / CI) — never in the app
5. [ ] Add Mollie **test** API key to server secrets; keep production key separate
6. [ ] Add Sentry DSN + auth token (EAS / CI) if error tracking should be enabled
7. [ ] Configure push notification credentials (FCM / Expo) when push flag can be enabled

## 2. Branding assets

8. [x] Place official logo mark (`assets/brand/logo-mark.png`) — received 2026-07-20
9. [ ] Optional: horizontal lockups + dedicated white monochrome notification silhouette
10. [ ] Provide Play Store feature graphic + screenshots (no real PII)

## 3. Backend migrations (explicit approval required)

11. [ ] Review local SQL under `supabase/migrations/` (headers say NOT APPLIED)
12. [ ] Run migrations on a **non-production** branch / staging first
13. [ ] Approve production apply using `docs/production-migration-runbook.md`
14. [ ] Deploy Edge Functions: `create-checkout`, `mollie-webhook`, notifications, etc.
15. [ ] Verify RLS policy tests on staging

## 4. Payments & Play policy

16. [ ] Legal / policy review of product categories vs Google Play Billing
17. [ ] Decide when `mollie_checkout` and `digital_product_checkout` flags may turn on
18. [ ] Configure Mollie webhook URL to the deployed function
19. [ ] Sandbox end-to-end payment test (never production cards in Maestro)

## 5. EAS / Android release

20. [ ] Create / link EAS project; set `EXPO_PUBLIC_EAS_PROJECT_ID`
21. [ ] Configure Android package `nl.vdbdigital.app` in Play Console
22. [ ] Let EAS manage the upload keystore (do not commit keystores)
23. [ ] Run `eas build --profile development` and install on Samsung Galaxy S25
24. [ ] Run `eas build --profile preview`
25. [ ] Run `eas build --profile production` (AAB) after gates pass
26. [ ] Upload AAB to Play Console internal testing (owner action)

## 6. App Links & URLs

27. [ ] Publish `https://vdbdigital.nl/.well-known/assetlinks.json` (see `docs/deep-links.md`)
28. [ ] Confirm privacy URL, terms URL, account deletion URL are live
29. [ ] Publish NL + EN account deletion page copy from `docs/account-deletion.md`

## 7. Play Store listing

30. [ ] Fill Data Safety form using `docs/store/data-safety-draft.md` (owner-reviewed)
31. [ ] Paste NL/EN store texts from `docs/play-store-submission.md`
32. [ ] Create Play review test account with safe demo data only
33. [ ] Confirm D-U-N-S / org details if required for Play / business verification
34. [ ] Submit for review when owner accepts residual risks in `docs/known-limitations.md`

## 8. Operations

35. [ ] Set partner commission rates and hold windows
36. [ ] Configure WhatsApp business number in env
37. [ ] Decide virus-scan provider or accept documented limitation
38. [ ] Assign first `admin` / `owner` roles **server-side only**
