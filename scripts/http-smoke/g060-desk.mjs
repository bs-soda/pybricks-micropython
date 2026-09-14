#!/usr/bin/env node
/**
 * G-060 — Agency Requests desk close gate.
 * Maps 1:1 to docs/02-product/acceptance/G-060.md scenarios 1–5.
 *
 * Hits a **already running** API (same door as the desk rewrite). Does not start
 * the server. No npm install. Continues after FAIL; exit 1 if any FAIL.
 *
 * UAT (admin-console AGENCY_API_ORIGIN):
 *   $env:API_BASE="https://uat-api-creatorhub.sodality.co.th/v1"
 *   node scripts/http-smoke/g060-desk.mjs
 *
 * Local KrakenD:
 *   node scripts/http-smoke/g060-desk.mjs
 *
 * Hub-direct (413 + optional /realtime):
 *   $env:API_BASE="http://127.0.0.1:8080"
 *
 * UI-only rows (Copy hidden, no Open Overview, neighbour screens, picker,
 * reconnect refetch) are **source asserts** on the Agency Admin files G-060
 * wired. Browser WebSocket 101 is not required — Hub handshake needs Bearer
 * which the browser cannot send; reconnect refetch is the E1 path.
 *
 * SKIP = no HTTP surface on this door (413 via KrakenD/HTTPS; /realtime on UAT).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACME_ID,
  BASE,
  EMAIL,
  MAX_PDF_MULTIPART_BYTES,
  PASSWORD,
  ROOT,
  SEED_MANAGED_100,
  UNKNOWN_ID,
  mintBrandJwt,
  ok,
  pdfMultipart,
  request,
  requestDeclaredLength,
  requireApi,
  step,
  viaGateway,
} from "./lib.mjs";

const stats = { pass: 0, fail: 0, skip: 0 };
const failures = [];

const ADMIN = join(ROOT, "code/apps/admin-console/src");

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

function src(rel) {
  return readFileSync(join(ADMIN, rel), "utf8");
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

function packageCreate(marker) {
  return {
    mode: "managed",
    product_link: marker,
    package_id: SEED_MANAGED_100,
  };
}

function customCreate(marker) {
  return {
    mode: "custom",
    product_link: marker,
    custom_spec: {
      creator_count: 5,
      duration_days: 14,
      review_required: true,
      submit_deadline_days: 3,
    },
  };
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

async function uploadPdf(agency, brandId, requestId, quoted) {
  const { contentType, body } = pdfMultipart({ quoted });
  return request(
    "POST",
    `/agency/brands/${brandId}/requests/${requestId}/contract`,
    { token: agency, raw: body, contentType },
  );
}

function listPath(brandId, query = "") {
  return `/agency/brands/${brandId}/requests${query}`;
}

function idsOf(page) {
  return (page?.items || []).map((r) => r.id);
}

function httpsDoor() {
  return BASE.startsWith("https://");
}

// ---------------------------------------------------------------------------
// Scenario 1 / 3 / 4 / 5 — source (UI chrome the HTTP door cannot see)
// ---------------------------------------------------------------------------

await run("G060-S1-copy-hidden", "Q3 — list row has no Copy Brand request link", async () => {
  const page = src("app/(admin)/requests/page.tsx");
  assert(!page.includes("Copy link"), "requests list still has Copy link");
  assert(!page.includes("buildBrandRequestLink"), "requests list still builds a Brand request link");
});

await run("G060-S1-no-overview", "Q4 — desk does not offer Open Overview", async () => {
  const list = src("app/(admin)/requests/page.tsx");
  const detail = src("app/(admin)/requests/[id]/page.tsx");
  const stepper = src("components/RequestStepper.tsx");
  assert(!list.includes("Open Overview"), "list offers Open Overview");
  assert(!detail.includes("Open Overview"), "detail offers Open Overview");
  assert(!list.includes("OpenBrandOverviewButton"), "list imports OpenBrandOverviewButton");
  assert(!detail.includes("OpenBrandOverviewButton"), "detail imports OpenBrandOverviewButton");
  assert(!stepper.includes("Open Overview"), "stepper offers Open Overview");
});

await run("G060-S3-no-quote-field", "package upload has no quote field", async () => {
  const form = src("components/RequestDialogs.tsx");
  assert(
    form.includes("const showPrice = isCustom && (firstCustomQuote || isRevision)"),
    "UploadContractForm must hide price unless Custom",
  );
  assert(
    form.includes('kind={isCustom ? "quote" : "contract"}'),
    "package dropzone must not be quote kind",
  );
});

await run("G060-S3-no-decline", "desk has no decline / reject on upload", async () => {
  const form = src("components/RequestDialogs.tsx");
  const stepper = src("components/RequestStepper.tsx");
  const start = form.indexOf("export function UploadContractForm");
  const chunk = start >= 0 ? form.slice(start, start + 4500) : form;
  assert(!/\bDecline\b/.test(chunk), "UploadContractForm has Decline");
  assert(!/\bReject\b/.test(chunk), "UploadContractForm has Reject");
  assert(!/\bDecline\b/.test(stepper), "RequestStepper has Decline");
});

await run("G060-S4-picker-10mib", "Q5-B — picker blocks PDF > 10 MiB", async () => {
  const auth = src("lib/agency-auth.ts");
  const form = src("components/RequestDialogs.tsx");
  assert(
    auth.includes("export const MAX_PDF_BYTES = 10 * 1024 * 1024"),
    "MAX_PDF_BYTES is not 10 MiB",
  );
  assert(form.includes("if (file.size > MAX_PDF_BYTES)"), "picker does not block oversize");
});

await run("G060-S2-reconnect-refetch", "socket down → refetch (do not rely on missed events)", async () => {
  const auth = src("lib/agency-auth.ts");
  assert(auth.includes("onTick()"), "realtime client never refetches");
  assert(auth.includes("delay = Math.min(delay * 2, 8000)"), "reconnect backoff missing");
  assert(
    auth.includes('ws.onclose = () => {') && auth.includes("onTick()"),
    "close path must refetch",
  );
});

await run("G060-S2-no-e2", "Agency does not subscribe E2 contract.ready (G-062)", async () => {
  const auth = src("lib/agency-auth.ts");
  const start = auth.indexOf("const AGENCY_REALTIME_EVENTS");
  const block = start >= 0 ? auth.slice(start, start + 280) : auth;
  assert(block.includes('"request.submitted"'), "missing E1");
  assert(block.includes('"revision.requested"'), "missing E3");
  assert(block.includes('"contract.accepted"'), "missing E5");
  assert(block.includes('"request.paid_or_ready"'), "missing E6");
  assert(block.includes('"dual_auth.ready"'), "missing E7");
  assert(!block.includes("contract.ready"), "must not subscribe E2");
});

await run("G060-S5-neighbours", "Brands / Packages not rewritten on this card", async () => {
  const brands = src("app/(admin)/brands/page.tsx");
  const packages = src("app/(admin)/packages/page.tsx");
  assert(!brands.includes("fetchAgencyRequests"), "Brands page now lists R4");
  assert(!packages.includes("fetchAgencyRequests"), "Packages page now lists R4");
  assert(
    packages.includes("useCreatorHubStore"),
    "Packages page should still be the pre-G-060 mock catalogue",
  );
});

await run("G060-S1-r4-client", "list calls live R4 with session brandId, page 8", async () => {
  const page = src("app/(admin)/requests/page.tsx");
  const auth = src("lib/agency-auth.ts");
  assert(page.includes("fetchAgencyRequests"), "list is not live R4");
  assert(page.includes("useSession()"), "list must use session brand, not hubBrandId");
  assert(!page.includes("useBrandScope"), "list must not use mock hubBrandId");
  assert(auth.includes('params.set("page_size", String(query.pageSize ?? 8))'), "page 8 missing");
  assert(auth.includes('if (query.status && query.status !== "all") params.set("status"'), "status filter missing");
});

// ---------------------------------------------------------------------------
// Live API — same R4/R5/R10 the desk calls
// ---------------------------------------------------------------------------

await requireApi();
ok(
  `API ${BASE} · ${viaGateway() ? "gateway /v1" : "Hub-direct"} · ${EMAIL}`,
);

const agency = await loginAgency();
const brandId = await ensureBrand(agency);
const brand = mintBrandJwt(brandId);
const stamp = Date.now();
ok(`agency JWT + brand_id=${brandId}`);

await run("G060-S1-401", "expired / missing Agency JWT → 401, not mock rows", async () => {
  const res = await request("GET", listPath(brandId));
  assertStatus(res, 401, "R4 no bearer");
  const owed = await request("GET", "/agency/requests/owed-summary");
  assertStatus(owed, 401, "R10 no bearer");
});

await run("G060-S1-403-404", "non-member / unknown brand → error", async () => {
  const unknown = await request("GET", listPath(UNKNOWN_ID), { token: agency });
  assertStatus(unknown, [403, 404], "unknown brand");
  const email = `g060-nm-${stamp}@sodality.local`;
  const created = await request("POST", "/agency/accounts", {
    token: agency,
    body: { email, password: "nm-secret12", name: "G060 No Member", role: "agency" },
  });
  if (created.status !== 201) {
    skip(`POST /agency/accounts → ${created.status} (cannot mint a non-member JWT on this door)`);
  }
  const login = await request("POST", "/agency/auth/login", {
    body: { email, password: "nm-secret12" },
  });
  assertStatus(login, 200, "non-member login");
  const list = await request("GET", listPath(brandId), {
    token: login.body.access_token,
  });
  assertStatus(list, 403, "not a member");
});

await run("G060-S1-filters", "R4 q / status / mode / page 8 for the selected brand", async () => {
  const marker = `https://shop.example/g060-list-${stamp}`;
  const created = await request("POST", "/brand/requests", {
    token: brand,
    body: packageCreate(marker),
  });
  assertStatus(created, 201, "R1 package");
  assert(created.body.status === "submitted", "submitted");
  const id = created.body.id;

  const page = await request("GET", listPath(brandId, "?page=1&page_size=8"), {
    token: agency,
  });
  assertStatus(page, 200, "R4 page");
  assert(page.body.page_size === 8, `page_size ${page.body.page_size}`);
  assert(
    (page.body.items || []).every((r) => r.brand_id === brandId),
    "list leaked another brand",
  );

  const byQ = await request("GET", listPath(brandId, `?q=g060-list-${stamp}&page_size=8`), {
    token: agency,
  });
  assertStatus(byQ, 200, "R4 q");
  assert(idsOf(byQ.body).includes(id), `q missed ${id} ${dump(byQ.body)}`);

  const owed = await request("GET", listPath(brandId, "?status=owed&page_size=8"), {
    token: agency,
  });
  assertStatus(owed, 200, "R4 owed");
  const owedStatuses = new Set(["submitted", "revision_requested"]);
  for (const row of owed.body.items || []) {
    assert(owedStatuses.has(row.status), `owed leaked ${row.id} ${row.status}`);
  }
  assert(idsOf(owed.body).includes(id), "new submitted not in owed");

  const managed = await request("GET", listPath(brandId, "?mode=managed&page_size=8"), {
    token: agency,
  });
  assertStatus(managed, 200, "R4 mode");
  assert(
    (managed.body.items || []).every((r) => r.mode === "managed"),
    "mode=managed leaked custom",
  );

  const sorted = await request("GET", listPath(brandId, "?sort=newest&page_size=8"), {
    token: agency,
  });
  assertStatus(sorted, 200, "R4 sort");
});

await run("G060-S2-e1-appears", "R1 create is on the Agency list + R10 without a second seed", async () => {
  const marker = `https://shop.example/g060-e1-${stamp}`;
  const created = await request("POST", "/brand/requests", {
    token: brand,
    body: packageCreate(marker),
  });
  assertStatus(created, 201, "R1");
  const id = created.body.id;

  const list = await request("GET", listPath(brandId, `?q=g060-e1-${stamp}&page_size=8`), {
    token: agency,
  });
  assertStatus(list, 200, "R4 after R1");
  const row = (list.body.items || []).find((r) => r.id === id);
  assert(row, `desk R4 missing ${id}`);
  assert(row.status === "submitted", `want submitted, got ${row.status}`);

  const r10 = await request("GET", "/agency/requests/owed-summary", { token: agency });
  assertStatus(r10, 200, "R10");
  assert(Array.isArray(r10.body), "OwedGroup[]");
  assert(
    r10.body.some((g) => g.brand_id === brandId && g.count >= 1),
    `R10 missing brand ${dump(r10.body)}`,
  );
});

await run("G060-S3-package-upload", "package PDF → contract_ready; snapshot price unchanged", async () => {
  const marker = `https://shop.example/g060-pkg-${stamp}`;
  const created = await request("POST", "/brand/requests", {
    token: brand,
    body: packageCreate(marker),
  });
  assertStatus(created, 201, "R1 package");
  const id = created.body.id;
  const snapshot = created.body.package?.price;
  assert(typeof snapshot === "number" && snapshot > 0, "missing snapshot price");

  const stray = await uploadPdf(agency, brandId, id, "1");
  assertStatus(stray, 200, "R5 package PDF");
  assert(stray.body.status === "contract_ready", `want contract_ready, got ${stray.body.status}`);
  assert(
    stray.body.package?.price === snapshot,
    `snapshot ${snapshot} → ${stray.body.package?.price}`,
  );

  const owed = await request("GET", listPath(brandId, "?status=owed&page_size=8"), {
    token: agency,
  });
  assertStatus(owed, 200, "owed after upload");
  assert(!idsOf(owed.body).includes(id), "uploaded package still owed");

  const file = await request(
    "GET",
    `/agency/brands/${brandId}/requests/${id}/contract/file`,
    { token: agency, binary: true },
  );
  assertStatus(file, 200, "Agency PDF GET");
  const ct = file.headers.get("content-type") || "";
  assert(ct.includes("pdf"), `content-type ${ct}`);
  assert(Buffer.from(file.body).toString("utf8").includes("%PDF"), "PDF bytes");
});

await run("G060-S4-custom-quote", "Custom first upload needs quoted_price > 0 + PDF", async () => {
  const marker = `https://shop.example/g060-custom-${stamp}`;
  const created = await request("POST", "/brand/requests", {
    token: brand,
    body: customCreate(marker),
  });
  assertStatus(created, 201, "custom R1");
  const id = created.body.id;

  const noQuote = await uploadPdf(agency, brandId, id);
  assertStatus(noQuote, 400, "PDF without quote");
  const still = await request("GET", `/agency/brands/${brandId}/requests/${id}`, {
    token: agency,
  });
  assertStatus(still, 200, "GET after 400");
  assert(still.body.status === "submitted", `want submitted after 400, got ${still.body.status}`);

  const quoted = await uploadPdf(agency, brandId, id, "9000");
  assertStatus(quoted, 200, "quoted PDF");
  assert(quoted.body.status === "contract_ready", `want contract_ready, got ${quoted.body.status}`);
  assert(Number(quoted.body.quoted_price) === 9000, `quoted_price ${quoted.body.quoted_price}`);
});

await run("G060-S4-413", "oversize POST still returns 413 (Q5-B)", async () => {
  if (viaGateway() || httpsDoor()) {
    skip(
      "R5 413 uses declared Content-Length over cap; KrakenD/HTTPS RST before Hub DefaultBodyLimit. Hub-direct API_BASE=http://127.0.0.1:8080.",
    );
  }
  const created = await request("POST", "/brand/requests", {
    token: brand,
    body: packageCreate(`https://shop.example/g060-413-${stamp}`),
  });
  assertStatus(created, 201, "create for 413");
  const tooBig = await requestDeclaredLength(
    "POST",
    `/agency/brands/${brandId}/requests/${created.body.id}/contract`,
    {
      token: agency,
      raw: Buffer.from("x"),
      contentType: "multipart/form-data; boundary=x",
      contentLength: MAX_PDF_MULTIPART_BYTES + 1,
    },
  );
  assertStatus(tooBig, 413, "413 over cap");
});

console.log(
  `\nG-060 desk: ${stats.pass} passed, ${stats.fail} failed, ${stats.skip} skipped`,
);
if (failures.length) {
  console.error(failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
ok("all G-060 acceptance scenarios passed (SKIP is N/A on this door)");
