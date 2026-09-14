#!/usr/bin/env node
/**
 * Shared helpers for Agency Admin HTTP smoke (curl-style against a running API).
 * Default front door is KrakenD `http://127.0.0.1:9090/v1` (G-065). Hub-direct:
 * `$env:API_BASE="http://127.0.0.1:8080"`.
 */
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const FROZEN_YAML = join(
  ROOT,
  "docs/03-architecture/api/openapi-f1-agency-admin.yaml",
);
export const F2_YAML = join(
  ROOT,
  "docs/03-architecture/api/openapi-f2-f3-brand-starter.yaml",
);

export const BRAND_JWT_SECRET =
  process.env.BRAND_JWT_SECRET || "test-brand-jwt-secret";
export const ACME_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const OTHER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const UNKNOWN_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const SEED_MANAGED_100 = "11111111-1111-4111-8111-111111111111";
export const SEED_MANAGED_50 = "22222222-2222-4222-8222-222222222222";
export const SEED_BROADCAST_1000 = "33333333-3333-4333-8333-333333333333";
export const FIXTURE_MERCHANT_ID = "SODALITY-TEST-MERCHANT";
export const FIXTURE_AUTHORIZE_BASE =
  "https://partner.fixture.test/oauth/authorize";
export const FIXTURE_ACCESS_TOKEN = "seller-access-fixture";
export const FIXTURE_SHOP_CIPHER = "shop-cipher-fixture";
export const MAX_PDF_MULTIPART_BYTES = 10 * 1024 * 1024 + 64 * 1024;

/** Public UAT REST after G-065. Callers keep freeze-absolute `/agency` `/brand` `/payment/callback`. */
export const GATEWAY_DEFAULT = "http://127.0.0.1:9090/v1";

export const BASE = (process.env.API_BASE || GATEWAY_DEFAULT).replace(/\/$/, "");

/** True when `API_BASE` is the KrakenD public `/v1` door (port 9090 or path `/v1`). */
export function viaGateway() {
  try {
    const u = new URL(BASE);
    const path = u.pathname.replace(/\/$/, "");
    return u.port === "9090" || path === "/v1" || path.endsWith("/v1");
  } catch {
    return false;
  }
}

function cannotReach(url, detail) {
  return (
    `cannot reach ${url} (${detail}). ` +
    (viaGateway()
      ? "Start UAT compose (KrakenD :9090) first. See docker/README.md."
      : "Start the Hub first:\n  cd code\n  cargo run -p api")
  );
}

export const EMAIL =
  process.env.AGENCY_BOOTSTRAP_EMAIL || "admin@sodality.local";
export const PASSWORD = process.env.AGENCY_BOOTSTRAP_PASSWORD || "secret12";

const ERROR_KEYS = ["error", "message"];
const SESSION_KEYS = ["access_token", "refresh_token", "user"];
const USER_KEYS = [
  "id",
  "email",
  "name",
  "role",
  "avatar_url",
  "phone",
  "is_email_verified",
  "is_phone_verified",
  "status",
  "created_at",
  "updated_at",
  "last_login_at",
];
const USER_REQUIRED = [
  "id",
  "email",
  "role",
  "is_email_verified",
  "is_phone_verified",
  "status",
  "created_at",
  "updated_at",
];
const ROLES = ["agency", "brand", "creator"];
const STATUSES = ["active", "invited", "disabled", "deleted"];
const BRAND_KEYS = ["id", "name", "logo_url"];
const CAMPAIGN_KEYS = ["id", "name"];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function fail(message) {
  console.error(`FAIL  ${message}`);
  process.exit(1);
}

export function ok(message) {
  console.log(`  ${message}`);
}

export function step(title) {
  console.log(`\n→ ${title}`);
}

export function frozenYaml() {
  return readFileSync(FROZEN_YAML, "utf8");
}

export function frozenF2Yaml() {
  return readFileSync(F2_YAML, "utf8");
}

export function mintBrandJwt(brandId, secret = BRAND_JWT_SECRET) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: randomUUID(),
      email: "brand@test.local",
      aud: "authenticated",
      role: "authenticated",
      token_use: "access",
      iat: now,
      exp: now + 60 * 60,
      brand_id: brandId,
    }),
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function jwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) fail(`access_token is not a JWT: ${token.slice(0, 24)}…`);
  const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const buf = Buffer.from(padded, "base64");
  return JSON.parse(buf.toString("utf8"));
}

function keysOf(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object, got ${JSON.stringify(value)}`);
  }
  return Object.keys(value);
}

export function assertKeys(value, allowed, required, label) {
  const keys = keysOf(value, label);
  for (const req of required) {
    if (!keys.includes(req)) fail(`${label} missing required \`${req}\`: ${JSON.stringify(value)}`);
  }
  for (const key of keys) {
    if (!allowed.includes(key)) {
      fail(`${label} extra field \`${key}\` not in frozen schema`);
    }
  }
}

export function assertError(body, code) {
  assertKeys(body, ERROR_KEYS, ERROR_KEYS, "ErrorResponse");
  if (body.error !== code) fail(`ErrorResponse.error expected ${code}, got ${JSON.stringify(body)}`);
  if (typeof body.message !== "string" || !body.message) fail("ErrorResponse.message empty");
}

export function assertUser(value) {
  assertKeys(value, USER_KEYS, USER_REQUIRED, "User");
  if (!UUID_RE.test(value.id)) fail(`User.id must be uuid, got ${value.id}`);
  if (!String(value.email).includes("@")) fail("User.email");
  if (!ROLES.includes(value.role)) fail(`User.role ${value.role}`);
  if (!STATUSES.includes(value.status)) fail(`User.status ${value.status}`);
}

export function assertSession(value) {
  assertKeys(value, SESSION_KEYS, SESSION_KEYS, "AuthSession");
  if (value.access_token.split(".").length !== 3) fail("access_token must be a JWT");
  if (!value.refresh_token) fail("refresh_token empty");
  assertUser(value.user);
}

export function assertBrand(value) {
  assertKeys(value, BRAND_KEYS, ["id", "name"], "Brand");
  if (!UUID_RE.test(value.id)) fail(`Brand.id must be uuid, got ${value.id}`);
}

export function assertCampaign(value) {
  assertKeys(value, CAMPAIGN_KEYS, ["id", "name"], "Campaign");
  if (typeof value.id !== "string" || typeof value.name !== "string") {
    fail(`Campaign shape: ${JSON.stringify(value)}`);
  }
}

/**
 * One HTTP call — prints method/path/status like a curl session.
 */
export async function request(method, path, { body, token, expect, raw, contentType, binary } = {}) {
  const url = `${BASE}${path}`;
  const headers = { Accept: binary ? "*/*" : "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let fetchBody;
  if (raw !== undefined) {
    if (contentType) headers["Content-Type"] = contentType;
    fetchBody = raw;
  } else if (body !== undefined) {
    headers["Content-Type"] = contentType || "application/json";
    fetchBody = typeof body === "string" || body instanceof Uint8Array
      ? body
      : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: fetchBody,
    });
  } catch (err) {
    throw new Error(cannotReach(url, err.cause?.code || err.message));
  }

  if (binary) {
    const bytes = new Uint8Array(await res.arrayBuffer());
    const line = `${method} ${path} → ${res.status}`;
    console.log(line);
    if (expect !== undefined && res.status !== expect) {
      fail(`expected ${expect}, binary ${bytes.length} bytes`);
    }
    return { status: res.status, body: bytes, headers: res.headers };
  }

  const text = await res.text();
  const json = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  const line = `${method} ${path} → ${res.status}`;
  console.log(line);
  if (expect !== undefined && res.status !== expect) {
    fail(`expected ${expect}, body: ${typeof json === "string" ? json : JSON.stringify(json)}`);
  }
  return { status: res.status, body: json, headers: res.headers };
}

/**
 * POST with a declared Content-Length that may not match the bytes sent.
 * Axum `DefaultBodyLimit` (R5 413) checks the header before reading the body —
 * Node `fetch` always sets Content-Length from the payload, so a 10 MiB+ body
 * can ECONNRESET instead of returning 413.
 */
export async function requestDeclaredLength(
  method,
  path,
  { token, raw, contentType, contentLength } = {},
) {
  const url = new URL(`${BASE}${path}`);
  const payload = raw instanceof Uint8Array ? Buffer.from(raw) : Buffer.from(raw ?? "");
  const length = contentLength ?? payload.length;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(contentType ? { "Content-Type": contentType } : {}),
          "Content-Length": String(length),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          if (text) {
            try {
              json = JSON.parse(text);
            } catch {
              json = text;
            }
          }
          console.log(`${method} ${path} → ${res.statusCode}`);
          resolve({ status: res.statusCode, body: json, headers: res.headers });
        });
      },
    );
    req.on("error", (err) => {
      reject(new Error(cannotReach(url, err.code || err.message)));
    });
    req.write(payload);
    req.end();
  });
}

export function pdfMultipart({ quoted, fileBytes } = {}) {
  const boundary = "----G069Boundary";
  const chunks = [];
  if (quoted !== undefined && quoted !== null) {
    chunks.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="quoted_price"\r\n\r\n${quoted}\r\n`,
    );
  }
  chunks.push(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="c.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
  );
  const head = Buffer.from(chunks.join(""));
  const pdf = fileBytes ?? Buffer.from("%PDF-1.4 test");
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat([head, pdf, tail]),
  };
}

export async function requireApi() {
  step(`check API at ${BASE}`);
  if (viaGateway()) {
    const res = await request("GET", "/brand/packages");
    if (res.status !== 401 && res.status !== 200) {
      throw new Error(
        `KrakenD not forwarding Hub (GET /brand/packages → ${res.status}). ` +
          "Start docker compose and wait for :9090. See docker/README.md.",
      );
    }
    ok("KrakenD /v1 reached Hub");
    return;
  }
  await request("GET", "/openapi.json", { expect: 200 });
}
