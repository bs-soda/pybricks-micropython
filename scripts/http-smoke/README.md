# Agency Admin HTTP smoke (curl-style)

Hits a **already running** API one request at a time. Does not start the server.

## 1. Start the front door

**UAT / G-069 default:** KrakenD on `:9090` (Hub is docker-network only — no host `:8080`).

```powershell
docker compose up
```

Wait until `http://127.0.0.1:9090/v1` answers (e.g. `GET /brand/packages` → 401). See [docker/README.md](../../docker/README.md).

**Hub-direct (optional):** `cd code; cargo run -p api` then `$env:API_BASE="http://127.0.0.1:8080"`. Default bind `http://127.0.0.1:8080`. `cargo run` uses local GoTrue (`http://127.0.0.1:9999`). In-memory: `AGENCY_IN_MEMORY=1`.

## 2. Smoke (second terminal, repo root)

Needs Node 18+ (`fetch`). No `npm install`.

```powershell
node scripts/http-smoke/auth.mjs
node scripts/http-smoke/brands.mjs
```

F1 smokes default to KrakenD too. Hub-direct:

```powershell
$env:API_BASE="http://127.0.0.1:8080"
$env:AGENCY_BOOTSTRAP_EMAIL="admin@sodality.local"
$env:AGENCY_BOOTSTRAP_PASSWORD="secret12"
$env:BRAND_JWT_SECRET="test-brand-jwt-secret"
```

## 3. F2+F3 E2E (G-047 / G-052 / G-053 / G-054 / G-055 / G-056 / G-066)

Covers happy, edge, and failure rows from those acceptance contracts (not a single happy path). Continues after FAIL; exit 1 if any FAIL. SKIP = no HTTP surface (in-process fixture) **or** G-053 B1–B4 while `/brand/auth/*` is unmounted **or** Hub-only asserts when the base is KrakenD (runtime `/openapi.json`, Axum has no `/v1`). G-066 hits fixture `/brand/ads/*` — not live TikTok Business.

Default `API_BASE` is `http://127.0.0.1:9090/v1`. Paths in the runner stay freeze-absolute (`/agency`, `/brand`, `/payment/callback`).

```powershell
node scripts/http-smoke/api-test.mjs
```

Agency login is `/agency/auth/login` (G-068). Brand routes use a stub JWT (`BRAND_JWT_SECRET`). If `GET /agency/brands` is empty, the script calls `POST /agency/brands/seed`.

Hub-direct (OpenAPI JSON + Axum-has-no-`/v1`):

```powershell
$env:API_BASE="http://127.0.0.1:8080"
node scripts/http-smoke/api-test.mjs
```

## 4. G-050 WebSocket (`/realtime`)

Hub-direct only (not KrakenD `:9090/v1`). Mirrors `code/apps/backend/api/tests/realtime_api.rs`. Close gate is still `cargo test --package api --test realtime_api`. Restart `cargo run -p api` after G-050 so `/realtime` exists.

```powershell
cd code
# stop the old Hub if it is locking api.exe, then:
cargo run -p api
```

Second terminal, repo root (default `API_BASE` is `:8080`):

```powershell
node scripts/http-smoke/socket-test.mjs
```

## 5. G-060 Agency Requests desk

Acceptance scenarios in `docs/02-product/acceptance/G-060.md`. Live R4/R5/R10 plus source asserts for UI-only rows (Copy hidden, no Open Overview, picker 10 MiB, reconnect refetch). SKIP = 413 on KrakenD/HTTPS (same as G-069).

```powershell
# UAT
$env:API_BASE="https://uat-api-creatorhub.sodality.co.th/v1"
node scripts/http-smoke/g060-desk.mjs

# Local KrakenD
node scripts/http-smoke/g060-desk.mjs
```

