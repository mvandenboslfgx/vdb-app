# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# VDB DIGITAL — SHARED BACKEND ARCHITECTURE FREEZE

Deze repository is onderdeel van drie afzonderlijke VDB-projecten:

1. VDB Digital 2.0 website en webbeheer
2. VDB Digital Mobile
3. VDB Partner Portal / Affiliate

Alle drie blijven aparte repositories, maar gebruiken uiteindelijk dezelfde centrale Supabase Auth, database, Storage, Realtime en beveiligde serverfuncties.

```text
REPOSITORY_ROLE=MOBILE_CLIENT
```

## Harde architectuur

Omgevingen:

- **local:** iedere repository heeft een volledig geïsoleerde lokale Supabase-stack (unieke `project_id`, poorten, volumes);
- **staging:** alle drie gebruiken exact hetzelfde gedeelde VDB-stagingproject;
- **production:** alle drie gebruiken exact hetzelfde officiële VDB-productieproject.

Lokale database-isolatie betekent niet dat er drie productiedatabases ontstaan.

## Canonieke backend

De repository **VDB Digital 2.0** is de enige canonieke eigenaar van:

- productie-Supabase migrations;
- RLS-policies;
- Storage-policies;
- databasefuncties;
- financiële RPC’s;
- Edge Functions;
- Mollie-webhooks;
- gedeelde database-types en contracts.

Deze Mobile-client mag **geen** eigen remote productie-migrations toepassen.

Wanneer Mobile een schemawijziging nodig heeft:

1. maak een backend change proposal;
2. beschrijf tabellen, kolommen, policies, RPC’s en testvereisten;
3. pas lokaal een voorstel toe voor tests;
4. voer niets remote uit;
5. laat de definitieve migration landen in de canonieke VDB Digital 2.0-backend;
6. werk daarna de gedeelde backendcontractversie bij.

## Gedeelde identiteit

Alle drie gebruiken dezelfde gebruikers en rollen:

- `customer`
- `partner_pending`
- `partner`
- `staff`
- `admin`
- `owner`

Geen apart productie-authsysteem in deze repo.

## Repository-isolatie (hard)

Verboden:

- bestanden van siblingrepositories wijzigen;
- containers van siblingrepositories stoppen of verwijderen;
- Docker-wildcards gebruiken (`docker stop $(docker ps -q)` e.d.);
- globale node/powershell/java-processen beëindigen;
- poorten van andere repositories claimen;
- volumes of netwerken van siblingrepositories verwijderen;
- sibling testharnassen beëindigen.

Bij een conflict:

- rapporteer het conflict;
- sluit alleen het eigen proces;
- wijzig of verwijder niets buiten de huidige repository.

## Productieregels

Voer niet uit zonder expliciete eigenaarstoestemming:

- remote migration;
- productie-Edge-deployment;
- live Mollie;
- productiepush;
- production seed;
- remote reset;
- Git push;
- Play Store-upload.

## Docs (bron van waarheid)

- `docs/shared-backend-architecture.md`
- `docs/repository-responsibilities.md`
- `docs/environment-matrix.md`
- `docs/backend-contract.md`
- `docs/staging-integration-plan.md`
- `docs/cross-repository-test-plan.md`
- `docs/migration-ownership.md`
