# Local Supabase stability (device validation)

Updated: 2026-07-22

## Required stack (this repo only)

| Field | Value |
|---|---|
| `project_id` | `vdb-digital-mobile-local` |
| API | `127.0.0.1:54521` |
| DB | `127.0.0.1:54522` |
| Studio | `127.0.0.1:54523` |
| Kong container | `supabase_kong_vdb-digital-mobile-local` |
| DB container | `supabase_db_vdb-digital-mobile-local` |

Port block **5452x** is reserved for Mobile so it does not collide with:

| Sibling | Ports |
|---|---|
| `vdbdigital2` | 54321 / 54322 (defaults) |
| `vdb-partners` | 54421 / 54422 |

## Architecture freeze

Mobile agents must **never** stop or remove sibling containers.
On conflict: report + exit. Fix only this stack from this repo.

```powershell
npm run device:test:report-isolation
```

## Root causes observed (historical)

### 1. Port collision with `vdbdigital2` (fixed by remapping Mobile)

Previously Mobile also used 54321/54322. Competing agents starting `vdbdigital2` stole those ports mid-suite.

Mitigation now: unique Mobile ports + isolation policy (no sibling `docker rm`).

### 2. Docker Desktop memory pressure

Multiple full Supabase stacks still consume RAM. Prefer not running three heavy stacks during long Maestro sessions if OOM recurs — but **stop siblings only from their own Cursor windows**, never from Mobile.

### 3. Mid-suite DB disappearance

Often caused by another agent running `supabase stop` / reclaiming ports. With unique ports this should stop; keep sibling agents from issuing global Docker kills.

## Health gate expectations

1. Kong on `:54521` belongs to `vdb-digital-mobile-local`
2. DB container healthy
3. Auth `http://127.0.0.1:54521/auth/v1/health` → 200
4. `adb reverse` for `54521` and `8081`
5. Metro on `:8081` when required

```powershell
docker ps --format "table {{.Names}}\t{{.Ports}}"
curl.exe -s -o NUL -w "auth=%{http_code}`n" http://127.0.0.1:54521/auth/v1/health
adb reverse --list
```

## Related

- `docs/shared-backend-architecture.md`
- `docs/environment-matrix.md`
- `docs/cross-repository-test-plan.md`
