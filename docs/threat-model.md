# Threat Model (v1)

> **Backend remote migrations: NOT APPLIED.** All SQL under `supabase/migrations/` is a local proposal only. Do not apply to project `nhsrdnjfsxfikfbdmdfj` without explicit owner approval.


## Assets

- Customer PII, documents, messages
- Invoices / payment references
- Partner commission data / IBAN
- Staff admin actions
- Mollie API keys / service role key

## Top threats

| Threat | Mitigation |
|---|---|
| Privilege escalation via client | RLS + server role checks; no admin self-signup |
| Commission fraud | Staff-only approval; payment webhook authority; audit trail |
| Payment spoofing | Mollie re-fetch; ignore client paid claims |
| Document exfiltration | Private storage, signed URLs, RLS on metadata |
| Webhook replay | Idempotent event IDs |
| Secret leakage | No secrets in app; CI secret scan |
| Malicious uploads | MIME/size limits; scan status gate |

## Trust boundaries

Mobile app → untrusted  
Edge Functions + DB constraints → trusted for money moves  
Mollie webhooks → semi-trusted (verify + re-fetch)
