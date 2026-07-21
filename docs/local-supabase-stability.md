# Local Supabase stability (device validation)

Updated: 2026-07-21

## Required stack

| Field | Value |
|---|---|
| `project_id` | `vdb-digital-mobile-local` |
| API | `127.0.0.1:54321` |
| DB | `127.0.0.1:54322` |
| Kong container | `supabase_kong_vdb-digital-mobile-local` |
| DB container | `supabase_db_vdb-digital-mobile-local` |

## Root causes observed

### 1. Competing stack `vdbdigital2` (primary)

Containers named `*_vdbdigital2` bind **the same host ports** (`54321` / `54322`) as the mobile app stack.

Effects:

- Seeds and the app hit the wrong database (invalid credentials / missing fixtures).
- `npx supabase start` in this repo fails with `Bind for 0.0.0.0:54322 failed: port is already allocated`.
- The stack was observed to **respawn** after `docker rm` when started again from `C:\Users\XXX\vdbdigital2.0`.

Mitigation:

- Stop only that project: `npx supabase stop --project-id vdbdigital2` (from that repo) and `docker update --restart=no` + `docker rm -f` on leftover `*vdbdigital2*` containers.
- Never use `docker stop $(docker ps -q)`.
- Harness `device:test:reset` / health gate **hard-fails** with `INFRASTRUCTURE BLOCKED` if any `vdbdigital2` container is present or Kong on `:54321` is not `*vdb-digital-mobile-local*`.

### 2. Docker Desktop memory pressure (~7.7 GiB)

Running a second full Supabase stack (`vdb-partners`, offset ports `54421+`) alongside mobile-local caused:

- `supabase_analytics_vdb-partners` **exit 137** (SIGKILL / OOM).
- Mobile-local DB containers created then **destroyed** mid-health-check (`No such container` during `supabase start`).

Mitigation for validation sessions:

- Only `vdb-digital-mobile-local` should be active while running the Maestro suite.
- `vdb-partners` uses different ports and is safe port-wise, but still consumes RAM; stop it for long device runs if OOM recurs.

### 3. Mid-suite DB disappearance (historical)

Earlier suite runs saw `supabase_db_vdb-digital-mobile-local` exit while Maestro was still running. Current inspect after a clean start:

| Check | Result |
|---|---|
| Status | `running` |
| Exit code | `0` |
| OOMKilled | `false` |
| Health | `healthy` |
| RestartCount | `0` |
| Disk (host C:) | sufficient (Docker volumes ~425MB) |
| Migration/seed crash | not indicated in current logs |

Most historical “DB fell over” cases correlate with **port fights / wrong stack / OOM**, not a bad migration in this repo.

### 4. Metro down → font Render Error

When Metro on `:8081` is unreachable, `useFonts(SpaceMono)` fails with `ExpoAsset.downloadAsync` / `ERR_UNABLE_TO_DOWNLOAD_ASSET` and previously **threw**, producing a redbox that hides `btn-public-login`.

Mitigation:

- Health gate requires Metro HTTP 200 before Maestro.
- Root layout no longer throws on font failure; continues with system fonts.
- Keep `adb reverse tcp:8081 tcp:8081` for the debug APK.

### 5. External stacks respawning

`vdbdigital2` and `vdb-partners` have been observed restarting mid-suite from other local workspaces. Pre-flow health gate now **auto-removes** `*vdbdigital2*` containers; if Kong on `:54321` is wrong, the suite aborts with `INFRASTRUCTURE BLOCKED`.

### 6. Hostile cross-workspace watchdog (critical)

A parallel Cursor agent in `C:\Users\XXX\vdbdigital2.0` was observed running a PowerShell watchdog that every 5 seconds:

- `docker rm -f` on **all** `*vdb-digital-mobile-local*` containers;
- `Stop-Process` on any `device-test-harness` PID;
- then `npx supabase start` for `vdbdigital2`.

Stop that agent session before any definitive device PASS.

## Health gate (pre-flow)

`scripts/device-test-harness.mjs` (`prepare` / `reset` / `health`) and the Maestro runner require:

1. No forbidden stacks (`vdbdigital2`).
2. Exactly one Kong on `:54321` belonging to `vdb-digital-mobile-local`.
3. DB container running + healthy, not OOMKilled.
4. Auth `/auth/v1/health` → HTTP 200.
5. REST `/rest/v1/` reachable (not `000`).
6. `adb reverse` for `54321` and `8081`.
7. Metro `:8081/status` → 200 (when required).
8. App package `nl.vdbdigital.app` installed (reinstall from pinned APK SHA-256 if missing).

On failure the suite stops with **`INFRASTRUCTURE BLOCKED`** — no meaningless UI FAIL cascade.

## Operator checklist

```powershell
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
# Stop ONLY vdbdigital2 if present:
npx supabase stop --project-id vdbdigital2
docker ps -aq --filter "name=vdbdigital2" | % { docker update --restart=no $_; docker rm -f $_ }

cd C:\Users\XXX\vdb-app
npx supabase stop
npx supabase start
npx supabase status
curl.exe -s -o NUL -w "auth=%{http_code}`n" http://127.0.0.1:54321/auth/v1/health
docker ps --filter "name=supabase_kong" --format "{{.Names}} {{.Ports}}"
```

Expect: `supabase_kong_vdb-digital-mobile-local` on `0.0.0.0:54321`, `auth=200`, no `*vdbdigital2*` containers.
