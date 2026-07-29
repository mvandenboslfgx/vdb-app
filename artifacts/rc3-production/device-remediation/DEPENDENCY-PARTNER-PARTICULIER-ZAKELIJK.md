# Dependency — Partner PARTICULIER | ZAKELIJK (no Mobile data model yet)

```text
PARTNER PARTICULIER/ZAKELIJK MODEL NOT IMPLEMENTED — DEPENDENCY RECORDED
```

**Date:** 2026-07-29 (updated confirmation pass)
**Scope:** Temporary intake compatibility only
**Owner:** Canonical type design remains with VDB Digital 2.0 backend
**Blocker:** **S6 remains OPEN** until Owner model is fully implemented

## Domain correction

Partners may eventually be:

- **PARTICULIER** — individual; companyName/KVK **not** required
- **ZAKELIJK** — business; companyName **and** KVK **required** (Owner rule — not Mobile yet)

## Temporary Mobile intake (akkoord onder harde grenzen)

| Regel                                                                              | Status                                                                                          |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `companyName` / `kvkNumber` optioneel **alleen** tijdens generieke aanvraag/intake | Enforced in `validation/partner.ts`                                                             |
| Submit via Owner RPC `submit_partner_application`                                  | Wired in `partnersRepository.submitPartnerApplication` (no legacy `company_name` insert)        |
| Mapping                                                                            | `contactName` → `p_legal_name`; optional `companyName` → `p_trade_name`; optional KVK → `p_kvk` |
| Aanvraag zonder trade_name/KVK mag **nooit** auto-ACTIVE worden                    | Staging probe: application `SUBMITTED`, profile `PENDING`                                       |
| Geen verkoop / leads / commissies / payouts door intake alleen                     | Partner area gated by active `partner` role (`canAccessPartnerArea`)                            |
| Geen impliciet type afleiden uit companyName / KVK / display_name                  | No type field invented; helper returns nullables only                                           |
| `display_name` = presentatie, geen juridische identiteit                           | Admin directory title keys: `display_name` → `company_name` → `code` → `id`                     |
| Toekomst: PARTICULIER vs ZAKELIJK validatie                                        | Documented as `FUTURE_OWNER_ZAKELIJK_VALIDATION` — **not enforced**                             |

## Mobile must not

- invent `partner_kind` / `PARTICULIER` / `ZAKELIJK` enums or columns;
- treat missing company/KVK as permanent “always optional for ZAKELIJK approval”;
- skip identity / Owner approval;
- change database, contract, or production from Mobile.

## Staging nullable check

See `PARTNER_INTAKE_NULLABLE_STAGING.md` (API probe on `qzekuvmgfekzsowdecyk`).

## Tests

`__tests__/unit/partnerParticulierZakelijkIntake.test.ts`
