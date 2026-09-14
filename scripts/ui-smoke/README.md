# Agency Admin — Playwright UI smoke

Login URL is **`http://localhost:4002/admin/auth`**, not `http://localhost:4000/auth`.

## G-027 login (`agency-login.mjs`)

Covers **acceptance scenarios 1–3** in `docs/02-product/acceptance/G-027.md`.
Scenario 4 (Brand/Creator untouched) is a git/diff check.

| ID | Case |
|----|------|
| S2 | Empty email/password → `Enter email and password.` · no JWT |
| S1 | Wrong password → `Invalid email or password.` · stay on `/auth` · no JWT |
| S1 | Unknown email → same alert · no JWT |
| S2 | Login fetch aborted → cannot-reach alert · no mock success |
| S3 | Already on `/auth` · no redirect loop |
| S3 | Unauthenticated `/dashboard` → `/auth` · no Select Brand shell |
| S3 | Junk `agencyAccessToken` → `/auth/me` 401 · cleared · `/auth` |
| S1 | Valid `admin@sodality.local` / `secret12` → `/brands` · JWT · `role=agency` |
| S1 | Reload → `GET /auth/me` 200 · still `/brands` |
| S1+S3 | Sign Out → `POST /auth/logout` · JWT gone · `/dashboard` → `/auth` |

## G-028 Select Brand (`agency-select-brand.mjs`)

Covers **acceptance scenarios 1–4** in `docs/02-product/acceptance/G-028.md`.
Scenario 5 is git/diff.

| ID | Case |
|----|------|
| S4 | Live empty `GET /brands` → empty copy · no mock cards · JWT kept |
| S1 | Abort `GET /brands` → error UX · no mock list |
| S1–S3 | Stub two brands → select Acme → shell → reload → Switch brand → OtherCo |
| S2 | Ghost `agencyBrandId` + empty list → picker · id cleared · JWT kept |

## Run

```powershell
cd code
cargo run -p api
```

```powershell
cd code
pnpm --filter admin-console dev
```

```powershell
cd scripts/ui-smoke
npm install
npx playwright install chromium
cd ../..
node scripts/ui-smoke/agency-login.mjs
node scripts/ui-smoke/agency-select-brand.mjs
node scripts/ui-smoke/agency-session-refresh.mjs
node scripts/ui-smoke/brand-session-refresh.mjs
```

```powershell
$env:UI_SMOKE_HEADED="1"
node scripts/ui-smoke/agency-select-brand.mjs
```

Default headed pacing is **500ms per action** + **2s pause** after each case. Slower:

```powershell
$env:UI_SMOKE_HEADED="1"
$env:UI_SMOKE_DELAY_MS="3000"
$env:UI_SMOKE_SLOW_MS="800"
node scripts/ui-smoke/agency-select-brand.mjs
```

## G-110 session refresh (`agency-session-refresh.mjs`)

Covers **acceptance scenarios 1–2** in `docs/02-product/acceptance/G-110.md`.

| ID | Case |
|----|------|
| S1 | Login JSON omits `refresh_token`; `Set-Cookie: agency_refresh_token=…; Secure; HttpOnly; SameSite=Lax; Path=/`; cookie not in `document.cookie` |
| S1 | Dead access token + valid cookie → `POST /auth/refresh` 200, cookie rotated, desk stays signed in |
| S1 | First `GET /brands` 401 → refresh once → retry succeeds |
| S1 | `POST /auth/refresh` without cookie → 401 |
| S1 | `POST /auth/refresh` with invalid cookie → 401 |
| S2 | Mid-desk API 401 + refresh 401 → Sign in · JWT cleared · no brands desk |
| S2 | Reload with dead access token + rejected refresh → same bounce |
| S2 | Sign Out → logout clears cookie (`Max-Age=0`, `Path=/`) · `/dashboard` stays on Sign in |

Admin rewrite must hit the G-110 Hub (`AGENCY_API_ORIGIN=http://127.0.0.1:8080`, then restart admin-console). KrakenD `:9090/v1` still fronts the older Hub that returns `refresh_token` in JSON.

```powershell
node scripts/ui-smoke/agency-session-refresh.mjs
```

```powershell
$env:UI_SMOKE_HEADED="1"
node scripts/ui-smoke/agency-session-refresh.mjs
```

## G-111 Brand Portal session refresh (`brand-session-refresh.mjs`)

Covers **acceptance scenarios 1–2** in `docs/02-product/acceptance/G-111.md`. Does **not** call live TikTok (Q3 B) — the script mints Hub JWTs with `BRAND_JWT_SECRET` (default `test-brand-jwt-secret`) and injects `brand_refresh_token`.

| ID | Case |
|----|------|
| S1 | Land `/dashboard?token=` — query has short-lived JWT only; `brand_refresh_token` is HttpOnly `Path=/`; not in `document.cookie` |
| S1 | Dead access token + valid cookie → `POST /brand/api/auth/refresh` 200 JSON `{ access_token }` only, cookie rotated, desk stays signed in |
| S1 | First `GET /packages` 401 → refresh once → retry succeeds |
| S1 | Flow 1 HTTP I2 GET + I3 consume + B1 start do **not** `Set-Cookie: brand_refresh_token` |
| S1 | Login Kit callback without `code` → 302/303 `/brand/auth?error=` · no cookie · no `refresh_token` on Location |
| S1 | `POST /auth/refresh` without cookie → 401 |
| S1 | `POST /auth/refresh` with invalid cookie → 401 |
| S1 | `agency_refresh_token` only → 401 |
| S2 | Mid-desk API 401 + refresh 401 → Login · JWT and `userRole` cleared · no Sign Out chrome |
| S2 | Reload with dead access token + rejected refresh → same bounce |
| S2 | Logout → Hub `204` clears cookie (`Max-Age=0`, `Path=/`) · `/dashboard` stays on Login |
| S2 | `userRole=brand` without Hub token → Login · chrome does not stay open |

Brand rewrite must hit the G-111 Hub (`BRAND_API_ORIGIN=http://127.0.0.1:8080`, then restart brand-portal). KrakenD `:9090/v1` may still front an older Hub without B5.

```powershell
cd code
cargo run -p api
```

```powershell
cd code
$env:BRAND_API_ORIGIN="http://127.0.0.1:8080"
pnpm --filter brand-portal dev
```

```powershell
node scripts/ui-smoke/brand-session-refresh.mjs
```

```powershell
$env:UI_SMOKE_HEADED="1"
node scripts/ui-smoke/brand-session-refresh.mjs
```

## G-060 Requests desk (`agency-requests-desk.mjs`)

Covers **acceptance scenarios 1–5** in `docs/02-product/acceptance/G-060.md`. Chromium is **headed by default** so you can watch the desk. Brand create (R1) is API; the rest is the live Agency UI.

| ID | Case |
|----|------|
| S1 | `/requests` with no brand → “Select a brand…” |
| S1 | Select live Acme → table, no Copy link, no Open Overview |
| S1 | Needs Agency filter |
| S2 | Curl R1 while the desk is open → row appears without reload |
| S3 | Package PDF upload → Waiting on Brand |
| S4 | Picker blocks > 10 MiB; Custom without quote stays submitted; quote + PDF → contract_ready |
| S5 | Packages / Brands still open |

```powershell
node scripts/ui-smoke/agency-requests-desk.mjs
```

Headless: `$env:UI_SMOKE_HEADED="0"`.

