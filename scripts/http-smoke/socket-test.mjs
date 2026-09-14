#!/usr/bin/env node
/**
 * G-050 — Hub-direct `/realtime` WebSocket smoke (mirrors realtime_api.rs).
 * Hits an **already running** Hub. Does not start the server. No npm install.
 *
 * Not via KrakenD `/v1`. Default:
 *   cd code; cargo run -p api
 *   node scripts/http-smoke/socket-test.mjs
 *
 * Optional env: API_BASE (default http://127.0.0.1:8080), AGENCY_BOOTSTRAP_EMAIL,
 * AGENCY_BOOTSTRAP_PASSWORD, BRAND_JWT_SECRET (must match the Hub).
 *
 * Close gate for G-050 remains `cargo test --package api --test realtime_api`.
 * This runner is live optional (restart Hub after G-050 so `/realtime` exists).
 */
import { randomBytes } from "node:crypto";
import http from "node:http";
import https from "node:https";

if (!process.env.API_BASE) {
  process.env.API_BASE = "http://127.0.0.1:8080";
}

const {
  ACME_ID,
  BASE,
  BRAND_JWT_SECRET,
  EMAIL,
  FIXTURE_MERCHANT_ID,
  PASSWORD,
  SEED_MANAGED_100,
  frozenF2Yaml,
  mintBrandJwt,
  ok,
  pdfMultipart,
  request,
  requireApi,
  step,
  viaGateway,
} = await import("./lib.mjs");

const stats = { pass: 0, fail: 0, skip: 0 };
const failures = [];
const EVENT_WAIT_MS = 5000;
const NO_EVENT_MS = 250;

function skip(reason) {
  const err = new Error(reason);
  err.skip = true;
  throw err;
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function assertStatus(res, want, label) {
  const allowed = Array.isArray(want) ? want : [want];
  if (!allowed.includes(res.status)) {
    throw new Error(
      `${label}: expected ${allowed.join("|")}, got ${res.status} ${dump(res.body)}`,
    );
  }
}

function dump(body) {
  if (body == null) return "";
  if (typeof body === "string") return body.slice(0, 400);
  try {
    return JSON.stringify(body).slice(0, 400);
  } catch {
    return String(body);
  }
}

async function run(id, title, fn) {
  step(`${id} — ${title}`);
  try {
    await fn();
    stats.pass += 1;
    ok(`PASS ${id}`);
  } catch (err) {
    if (err?.skip) {
      stats.skip += 1;
      console.log(`  SKIP  ${id}: ${err.message}`);
      return;
    }
    stats.fail += 1;
    const msg = err?.message || String(err);
    failures.push(`${id}: ${msg}`);
    console.error(`  FAIL  ${id}: ${msg}`);
  }
}

function successCallback(orderId, amount = 250000) {
  return {
    merchant_id: FIXTURE_MERCHANT_ID,
    detail: {
      response_code: 0,
      order_id: orderId,
      receive_amount: amount,
      payment_reference_id: "INET-REF-1",
    },
  };
}

function oauthState(url) {
  const part = String(url).split("state=")[1];
  if (!part) throw new Error(`authorize_url missing state: ${url}`);
  return part.split("&")[0];
}

function wsTarget() {
  const base = new URL(BASE);
  return {
    transport: base.protocol === "https:" ? https : http,
    hostname: base.hostname,
    port: base.port || (base.protocol === "https:" ? 443 : 80),
    path: "/realtime",
  };
}

function handshakeHeaders(token, key = randomBytes(16).toString("base64")) {
  const headers = {
    Upgrade: "websocket",
    Connection: "Upgrade",
    "Sec-WebSocket-Key": key,
    "Sec-WebSocket-Version": "13",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** HTTP GET /realtime with WS upgrade headers. 401 body or 101 upgrade (socket closed). */
function handshake(token) {
  const { transport, hostname, port, path } = wsTarget();
  return new Promise((resolve, reject) => {
    const req = transport.request(
      { hostname, port, path, method: "GET", headers: handshakeHeaders(token) },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let body = null;
          if (text) {
            try {
              body = JSON.parse(text);
            } catch {
              body = text;
            }
          }
          console.log(`GET ${path} (upgrade) → ${res.statusCode}`);
          resolve({ status: res.statusCode, body });
        });
      },
    );
    req.on("upgrade", (res, socket) => {
      socket.destroy();
      console.log(`GET ${path} (upgrade) → ${res.statusCode}`);
      resolve({ status: res.statusCode, body: null });
    });
    req.on("error", (err) => {
      reject(new Error(`cannot reach ws://${hostname}:${port}${path} (${err.code || err.message})`));
    });
    req.end();
  });
}

function tryParseFrame(buf) {
  if (buf.length < 2) return null;
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
  let len = buf[1] & 0x7f;
  let offset = 2;
  if (len === 126) {
    if (buf.length < 4) return null;
    len = buf.readUInt16BE(2);
    offset = 4;
  } else if (len === 127) {
    if (buf.length < 10) return null;
    len = Number(buf.readBigUInt64BE(2));
    offset = 10;
  }
  if (masked) {
    if (buf.length < offset + 4 + len) return null;
    const mask = buf.subarray(offset, offset + 4);
    offset += 4;
    const payload = Buffer.alloc(len);
    for (let i = 0; i < len; i += 1) payload[i] = buf[offset + i] ^ mask[i % 4];
    return { opcode, payload, rest: buf.subarray(offset + len) };
  }
  if (buf.length < offset + len) return null;
  return { opcode, payload: buf.subarray(offset, offset + len), rest: buf.subarray(offset + len) };
}

function encodeMasked(opcode, payload) {
  const data = Buffer.from(payload);
  const mask = randomBytes(4);
  const masked = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 1) masked[i] = data[i] ^ mask[i % 4];
  let header;
  if (data.length < 126) {
    header = Buffer.alloc(6);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | data.length;
    mask.copy(header, 2);
  } else if (data.length < 65536) {
    header = Buffer.alloc(8);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(data.length, 2);
    mask.copy(header, 4);
  } else {
    throw new Error("websocket payload too large");
  }
  return Buffer.concat([header, masked]);
}

class RealtimeSocket {
  constructor(socket, head, label) {
    this.socket = socket;
    this.label = label;
    this.buf = head?.length ? Buffer.from(head) : Buffer.alloc(0);
    this.queue = [];
    this.wait = null;
    this.closed = false;
    socket.on("data", (chunk) => {
      this.buf = Buffer.concat([this.buf, chunk]);
      this.drain();
    });
    socket.on("close", () => this.shutdown());
    socket.on("error", () => this.shutdown());
    this.drain();
  }

  shutdown() {
    this.closed = true;
    if (this.wait) {
      const { resolve } = this.wait;
      this.wait = null;
      resolve(null);
    }
  }

  drain() {
    for (;;) {
      const parsed = tryParseFrame(this.buf);
      if (!parsed) return;
      this.buf = parsed.rest;
      if (parsed.opcode === 0x8) {
        this.socket.end();
        this.shutdown();
        return;
      }
      if (parsed.opcode === 0x9) {
        this.socket.write(encodeMasked(0xa, parsed.payload));
        continue;
      }
      if (parsed.opcode !== 0x1) continue;
      let event;
      try {
        event = JSON.parse(parsed.payload.toString("utf8"));
      } catch {
        continue;
      }
      if (this.wait) {
        const { resolve } = this.wait;
        this.wait = null;
        resolve(event);
      } else {
        this.queue.push(event);
      }
    }
  }

  next(ms) {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    if (this.closed) return Promise.resolve(null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.wait?.timer === timer) this.wait = null;
        resolve(null);
      }, ms);
      this.wait = {
        timer,
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
      };
    });
  }

  close() {
    if (this.closed) return;
    try {
      this.socket.write(encodeMasked(0x8, Buffer.alloc(0)));
    } catch {
      /* ignore */
    }
    this.socket.destroy();
    this.shutdown();
  }
}

function openSocket(token, label) {
  const { transport, hostname, port, path } = wsTarget();
  return new Promise((resolve, reject) => {
    const req = transport.request({
      hostname,
      port,
      path,
      method: "GET",
      headers: handshakeHeaders(token),
    });
    req.on("upgrade", (res, socket, head) => {
      if (res.statusCode !== 101) {
        socket.destroy();
        reject(new Error(`${label} upgrade ${res.statusCode}`));
        return;
      }
      console.log(`WS ${path} (${label}) → ${res.statusCode}`);
      resolve(new RealtimeSocket(socket, head, label));
    });
    req.on("response", (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        reject(
          new Error(
            `${label} handshake expected 101, got ${res.statusCode} ${text.slice(0, 240)}`,
          ),
        );
      });
    });
    req.on("error", (err) => {
      reject(new Error(`${label} ws connect failed (${err.code || err.message})`));
    });
    req.end();
  });
}

async function nextEvent(sock, ms = EVENT_WAIT_MS) {
  const event = await sock.next(ms);
  if (!event) {
    throw new Error(`timed out waiting for ${sock.label} realtime event`);
  }
  return event;
}

async function noEvent(sock, ms = NO_EVENT_MS) {
  const event = await sock.next(ms);
  if (event) {
    throw new Error(`unexpected ${sock.label} event: ${JSON.stringify(event)}`);
  }
}

async function loginAgency() {
  const { status, body } = await request("POST", "/agency/auth/login", {
    body: { email: EMAIL, password: PASSWORD },
  });
  assertStatus({ status, body }, 200, "agency login");
  assert(typeof body?.access_token === "string", "login missing access_token");
  return body.access_token;
}

async function ensureBrand(agency) {
  let { status, body } = await request("GET", "/agency/brands", { token: agency });
  assertStatus({ status, body }, 200, "GET /agency/brands");
  assert(Array.isArray(body), "Brand[] expected");
  if (body.length === 0) {
    ({ status, body } = await request("POST", "/agency/brands/seed", { token: agency }));
    assertStatus({ status, body }, 200, "POST /agency/brands/seed");
    assert(Array.isArray(body) && body.length > 0, "seed returned no brands");
  }
  const acme = body.find((b) => b.id === ACME_ID);
  return acme?.id || body[0].id;
}

async function uploadPdf(agency, brandId, requestId) {
  const { contentType, body } = pdfMultipart();
  return request(
    "POST",
    `/agency/brands/${brandId}/requests/${requestId}/contract`,
    { token: agency, raw: body, contentType },
  );
}

if (viaGateway()) {
  console.error(
    "G-050 /realtime is Hub-direct (not KrakenD /v1).\n" +
      "  $env:API_BASE=\"http://127.0.0.1:8080\"\n" +
      "  cd code; cargo run -p api\n" +
      "  node scripts/http-smoke/socket-test.mjs",
  );
  process.exit(1);
}

const yaml = frozenF2Yaml();
assert(yaml.includes("  /realtime:"), "frozen yaml missing /realtime");
ok(`API ${BASE} · Hub-direct WS · BRAND_JWT_SECRET=${BRAND_JWT_SECRET === "test-brand-jwt-secret" ? "test default" : "env"}`);

await requireApi();

const agency = await loginAgency();
const brandId = await ensureBrand(agency);
const brand = mintBrandJwt(brandId);
ok(`agency JWT + brand_id=${brandId}`);

await run("G050-S1-401", "handshake missing/junk Bearer → 401", async () => {
  const missing = await handshake();
  assertStatus(missing, 401, "no Authorization");
  assert(missing.body?.error === "UNAUTHORIZED", `error ${dump(missing.body)}`);

  const junk = await handshake("not-a-token");
  assertStatus(junk, 401, "junk bearer");
  assert(junk.body?.error === "UNAUTHORIZED", `error ${dump(junk.body)}`);
});

await run("G050-S1-101", "agency or brand Bearer upgrades", async () => {
  const agencySock = await openSocket(agency, "agency");
  const brandSock = await openSocket(brand, "brand");
  agencySock.close();
  brandSock.close();
});

await run("G050-openapi", "runtime lists GET /realtime (realtimeHandshake)", async () => {
  const spec = (await request("GET", "/openapi.json", { expect: 200 })).body;
  assert(spec.paths?.["/realtime"], "runtime missing /realtime");
  assert(
    spec.paths["/realtime"].get?.operationId === "realtimeHandshake",
    `operationId ${spec.paths["/realtime"].get?.operationId}`,
  );
});

await run("G050-S2-e1-e7", "persist-then-push E1–E7; E3 is not E2", async () => {
  const agencyRx = await openSocket(agency, "agency");
  const brandRx = await openSocket(brand, "brand");
  try {
    const created = await request("POST", "/brand/requests", {
      token: brand,
      body: {
        mode: "managed",
        product_link: "https://shop.example/sku",
        package_id: SEED_MANAGED_100,
      },
    });
    assertStatus(created, 201, "R1 create");
    const id = created.body.id;
    const e1 = await nextEvent(agencyRx);
    assert(e1.event === "request.submitted", `E1 ${dump(e1)}`);
    assert(e1.id === id, `E1 id ${e1.id}`);
    assert(e1.status === "submitted", `E1 status ${e1.status}`);
    await noEvent(brandRx);

    const tooSoon = await request("POST", `/brand/requests/${id}/revision`, {
      token: brand,
      body: { comment: "too soon" },
    });
    assertStatus(tooSoon, 400, "revision before PDF");
    await noEvent(agencyRx);

    const uploaded = await uploadPdf(agency, brandId, id);
    assertStatus(uploaded, 200, "R5 first PDF");
    const e2 = await nextEvent(brandRx);
    assert(e2.event === "contract.ready", `E2 ${dump(e2)}`);
    assert(e2.id === id, `E2 id ${e2.id}`);
    assert(e2.version === "1.0", `E2 version ${e2.version}`);
    await noEvent(agencyRx);

    const rev = await request("POST", `/brand/requests/${id}/revision`, {
      token: brand,
      body: { comment: "fix logo" },
    });
    assertStatus(rev, 200, "R6 revision");
    const e3 = await nextEvent(agencyRx);
    assert(e3.event === "revision.requested", `E3 ${dump(e3)}`);
    assert(e3.status === "revision_requested", `E3 status ${e3.status}`);
    await noEvent(brandRx);

    const v11 = await uploadPdf(agency, brandId, id);
    assertStatus(v11, 200, "R5 revise PDF");
    const e2b = await nextEvent(brandRx);
    assert(e2b.event === "contract.ready", `E2b ${dump(e2b)}`);
    assert(e2b.version === "1.1", `E2b version ${e2b.version}`);

    const deactivated = await request(
      "POST",
      `/agency/packages/${SEED_MANAGED_100}/deactivate`,
      { token: agency },
    );
    assertStatus(deactivated, 200, "P5 deactivate");
    const e4 = await nextEvent(brandRx);
    assert(e4.event === "package.visibility", `E4 ${dump(e4)}`);
    assert(e4.id === SEED_MANAGED_100, `E4 id ${e4.id}`);
    assert(e4.status === "deactivated", `E4 status ${e4.status}`);
    await noEvent(agencyRx);

    const activated = await request(
      "POST",
      `/agency/packages/${SEED_MANAGED_100}/activate`,
      { token: agency },
    );
    assertStatus(activated, 200, "P4 activate");
    const e4b = await nextEvent(brandRx);
    assert(e4b.event === "package.visibility", `E4b ${dump(e4b)}`);
    assert(e4b.status === "active", `E4b status ${e4b.status}`);

    const rec = await request("PUT", `/agency/packages/${SEED_MANAGED_100}/recommended`, {
      token: agency,
    });
    assertStatus(rec, 200, "P7 recommended");
    await noEvent(brandRx);

    const accepted = await request("POST", `/brand/requests/${id}/accept`, {
      token: brand,
      body: { accepted: true },
    });
    assertStatus(accepted, 200, "R7 accept");
    const e5 = await nextEvent(agencyRx);
    assert(e5.event === "contract.accepted", `E5 ${dump(e5)}`);
    assert(e5.status === "accepted", `E5 status ${e5.status}`);
    await noEvent(brandRx);

    const session = await request("POST", `/brand/requests/${id}/pay-sessions`, {
      token: brand,
      body: { method: "qr" },
    });
    assertStatus(session, 201, "$1 pay-sessions");
    const orderId = session.body.order_id;
    await noEvent(agencyRx);

    const paid = await request("POST", "/payment/callback", {
      body: successCallback(orderId),
    });
    assertStatus(paid, 200, "$2 callback");
    const e6 = await nextEvent(agencyRx);
    assert(e6.event === "request.paid_or_ready", `E6 ${dump(e6)}`);
    assert(e6.status === "paid" || e6.status === "ready", `E6 status ${e6.status}`);
    assert(e6.event !== "dual_auth.ready", "E6 must not be E7");
    await noEvent(brandRx);

    const dup = await request("POST", "/payment/callback", {
      body: successCallback(orderId),
    });
    assertStatus(dup, 200, "$2 duplicate");
    await noEvent(agencyRx);

    const got = await request("GET", `/brand/requests/${id}`, { token: brand });
    assertStatus(got, 200, "GET request after pay");
    assert(
      got.body.status === "paid" || got.body.status === "ready",
      `want paid|ready, got ${got.body.status}`,
    );

    const sellerStart = await request("POST", "/brand/seller/authorize", { token: brand });
    assertStatus(sellerStart, 200, "S1 authorize");
    const sellerCb = await request(
      "GET",
      `/brand/seller/callback?code=ok&state=${oauthState(sellerStart.body.authorize_url)}`,
    );
    assertStatus(sellerCb, 200, "S2 callback");
    let e7 = await agencyRx.next(EVENT_WAIT_MS);
    if (!e7) {
      const adsStart = await request("POST", "/brand/ads/authorize", { token: brand });
      assertStatus(adsStart, 200, "A1 authorize");
      const adsCb = await request(
        "GET",
        `/brand/ads/callback?code=ok&state=${oauthState(adsStart.body.authorize_url)}`,
      );
      assertStatus(adsCb, 200, "A2 callback");
      e7 = await nextEvent(agencyRx);
    }
    assert(e7.event === "dual_auth.ready", `E7 ${dump(e7)}`);
    assert(e7.id === brandId, `E7 id is brand_id, got ${e7.id}`);
    await noEvent(brandRx);
  } finally {
    agencyRx.close();
    brandRx.close();
  }
});

await run("G050-S2-e7-ads-second", "ads callback emits E7 when seller already valid", async () => {
  const agencyRx = await openSocket(agency, "agency");
  try {
    const created = await request("POST", "/brand/requests", {
      token: brand,
      body: {
        mode: "managed",
        product_link: "https://shop.example/sku-e7",
        package_id: SEED_MANAGED_100,
      },
    });
    assertStatus(created, 201, "R1 create");
    const id = created.body.id;
    const e1 = await nextEvent(agencyRx);
    assert(e1.event === "request.submitted", "drain E1");

    const uploaded = await uploadPdf(agency, brandId, id);
    assertStatus(uploaded, 200, "R5 PDF");
    const accepted = await request("POST", `/brand/requests/${id}/accept`, {
      token: brand,
      body: { accepted: true },
    });
    assertStatus(accepted, 200, "R7 accept");
    const e5 = await nextEvent(agencyRx);
    assert(e5.event === "contract.accepted", "drain E5");

    const session = await request("POST", `/brand/requests/${id}/pay-sessions`, {
      token: brand,
      body: { method: "qr" },
    });
    assertStatus(session, 201, "$1");
    const paid = await request("POST", "/payment/callback", {
      body: successCallback(session.body.order_id),
    });
    assertStatus(paid, 200, "$2");
    const e6 = await nextEvent(agencyRx);
    assert(e6.event === "request.paid_or_ready", "E6 before E7");
    assert(e6.event !== "dual_auth.ready", "$2 must not emit E7");

    const sellerStart = await request("POST", "/brand/seller/authorize", { token: brand });
    assertStatus(sellerStart, 200, "S1");
    const sellerCb = await request(
      "GET",
      `/brand/seller/callback?code=ok&state=${oauthState(sellerStart.body.authorize_url)}`,
    );
    assertStatus(sellerCb, 200, "S2");
    const afterSeller = await agencyRx.next(NO_EVENT_MS);
    if (afterSeller?.event === "dual_auth.ready") {
      skip("ads already valid on this Hub; E7 fired on seller callback (covered by G050-S2-e1-e7)");
    }
    assert(!afterSeller, `unexpected after seller: ${dump(afterSeller)}`);

    const adsStart = await request("POST", "/brand/ads/authorize", { token: brand });
    assertStatus(adsStart, 200, "A1");
    const adsCb = await request(
      "GET",
      `/brand/ads/callback?code=ok&state=${oauthState(adsStart.body.authorize_url)}`,
    );
    assertStatus(adsCb, 200, "A2");
    const e7 = await nextEvent(agencyRx);
    assert(e7.event === "dual_auth.ready", `E7 ${dump(e7)}`);
  } finally {
    agencyRx.close();
  }
});

console.log(
  `\nG-050 socket-test: ${stats.pass} pass · ${stats.fail} fail · ${stats.skip} skip`,
);
if (failures.length) {
  console.error(failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
