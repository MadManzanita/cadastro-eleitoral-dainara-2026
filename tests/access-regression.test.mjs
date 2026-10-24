import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fetchAllRows } from "../lib/database-pagination.mjs";

async function loadRoute(path, imports, bindings) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  source = source.replace('import { registrationsClosed, REGISTRATION_CLOSED_MESSAGE } from "../../../lib/registration-window.mjs";', 'const registrationsClosed = () => false; const REGISTRATION_CLOSED_MESSAGE = "Closed";');
  for (const [statement, replacement] of imports) source = source.replace(statement, replacement);
  globalThis.__accessRegression = bindings;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Math.random()}`);
}
const NextResponse = { json: (body, options = {}) => ({ body, status: options.status || 200 }) };
const errorsSource = await readFile(new URL("../lib/database-errors.js", import.meta.url), "utf8");
const errors = await import(`data:text/javascript;base64,${Buffer.from(errorsSource).toString("base64")}`);

test("account data tolerates only the confirmed missing optional history table", async () => {
  const historyError = { code: "PGRST205", message: "Could not find the table 'public.trust_network_history' in the schema cache" };
  let failure = historyError;
  let role = "admin";
  let savedRows = [];
  const db = { from(table) {
    const result = { data: table === "leaderships" ? [{ id: "leader", name: "Test" }] : table === "families" ? savedRows : [], error: table === "trust_network_history" ? failure : null };
    let offset = 0;
    const chain = { range(from) { offset = from; return this; }, select() { return this; }, order() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { id: "leader", archived_at: null }, error: null }), then(resolve) { return Promise.resolve({ ...result, data: result.data.slice(offset, offset + 500) }).then(resolve); } };
    return chain;
  } };
  const route = await loadRoute("../app/api/data/route.js", [
    ['import { fetchAllRows } from "../../../lib/database-pagination.mjs";', 'const { fetchAllRows } = globalThis.__accessRegression;'],
    ['import { NextResponse } from "next/server";', 'const { NextResponse } = globalThis.__accessRegression;'],
    ['import { sessionFromRequest, supabaseAdmin } from "../../../lib/server-auth";', 'const { sessionFromRequest, supabaseAdmin } = globalThis.__accessRegression;'],
    ['import { isDuplicateRegistration, isMissingOptionalHistory } from "../../../lib/database-errors";', 'const { isDuplicateRegistration, isMissingOptionalHistory } = globalThis.__accessRegression;'],
  ], { fetchAllRows, NextResponse, sessionFromRequest: () => ({ role, id: "leader" }), supabaseAdmin: () => db, ...errors });
  assert.equal((await route.GET({})).status, 200);
  savedRows = Array.from({ length: 1237 }, (_, index) => ({ id: `record-${index}`, leadership_id: "leader", name: "Test" }));
  const completeResponse = await route.GET({});
  assert.equal(completeResponse.body.db.families.length, 1237);
  assert.equal(new Set(completeResponse.body.db.families.map((item) => item.id)).size, 1237);
  role = "leader";
  const leaderResponse = await route.GET({});
  assert.equal(leaderResponse.status, 200);
  assert.equal(leaderResponse.body.db.leaderships[0].id, "leader");
  role = "activist";
  assert.equal((await route.GET({})).status, 401);
  role = "admin";
  failure = { code: "42501", message: "permission denied" };
  assert.equal((await route.GET({})).status, 500);
  failure = { code: "PGRST205", message: "Could not find the table 'public.leaderships' in the schema cache" };
  assert.equal((await route.GET({})).status, 500);
});

test("activist data loads through its own session and remains scoped to its account", async () => {
  const filters = [];
  let session = { role: "activist", authMethod: "password-v1", id: "activist", leadershipId: "leader" };
  const db = { from(table) {
    let offset = 0;
    return {
      range(from) { offset = from; return this; },
      select() { return this; }, order() { return this; }, eq(field, value) { filters.push([table, field, value]); return this; },
      maybeSingle: async () => ({ data: { id: "leader", archived_at: null }, error: null }),
      then(resolve) { return Promise.resolve({ data: offset === 0 ? [{ id: "family", activist_id: "activist", leadership_id: "leader", name: "Test" }] : [], error: null }).then(resolve); },
    };
  } };
  const route = await loadRoute("../app/api/families/route.js", [
    ['import { NextResponse } from "next/server";', 'const { NextResponse } = globalThis.__accessRegression;'],
    ['import { sessionFromRequest, supabaseAdmin, verifySession } from "../../../lib/server-auth";', 'const { sessionFromRequest, supabaseAdmin, verifySession } = globalThis.__accessRegression;'],
    ['import { fetchAllRows } from "../../../lib/database-pagination.mjs";', 'const { fetchAllRows } = globalThis.__accessRegression;'],
    ['import { isDuplicateRegistration } from "../../../lib/database-errors";', 'const { isDuplicateRegistration } = globalThis.__accessRegression;'],
  ], { fetchAllRows, NextResponse, sessionFromRequest: () => null, verifySession: () => session, supabaseAdmin: () => db, ...errors });
  const request = { cookies: { get: () => ({ value: "test-cookie" }) } };
  const response = await route.GET(request);
  assert.equal(response.status, 200);
  assert.equal(response.body.items[0].id, "family");
  assert.ok(filters.some(([table, field, value]) => table === "families" && field === "activist_id" && value === "activist"));
  assert.ok(filters.some(([table, field, value]) => table === "families" && field === "leadership_id" && value === "leader"));
  session = null;
  assert.equal((await route.GET(request)).status, 401);
});

test("activist context cannot inherit a simultaneous portal session", async (t) => {
  let portal = { role: "leader", id: "other-leader" };
  let activist = { role: "activist", authMethod: "password-v1", id: "activist", leadershipId: "leader" };
  let auditThrows = false;
  const inserted = [];
  const filters = [];
  const db = { from(table) {
    if (table === "trust_network_history" && auditThrows) throw new Error("Audit connection failed");
    let item = null;
    return {
      range() { return this; },
      select() { return this; }, order() { return this; },
      eq(field, value) { filters.push([table, field, value]); return this; },
      insert(value) { item = value; if (table === "families") inserted.push(value); return this; },
      single: async () => ({ data: { id: "test-family", ...item }, error: null }),
      maybeSingle: async () => ({ data: { id: "leader", archived_at: null }, error: null }),
      then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); },
    };
  } };
  const route = await loadRoute("../app/api/families/route.js", [
    ['import { NextResponse } from "next/server";', 'const { NextResponse } = globalThis.__accessRegression;'],
    ['import { sessionFromRequest, supabaseAdmin, verifySession } from "../../../lib/server-auth";', 'const { sessionFromRequest, supabaseAdmin, verifySession } = globalThis.__accessRegression;'],
    ['import { fetchAllRows } from "../../../lib/database-pagination.mjs";', 'const { fetchAllRows } = globalThis.__accessRegression;'],
    ['import { isDuplicateRegistration } from "../../../lib/database-errors";', 'const { isDuplicateRegistration } = globalThis.__accessRegression;'],
  ], { fetchAllRows, NextResponse, sessionFromRequest: () => portal, verifySession: () => activist, supabaseAdmin: () => db, ...errors });
  const request = (context) => ({
    headers: new Headers(context ? { "x-access-context": context } : {}),
    cookies: { get: () => ({ value: "verified-by-test-stub" }) },
    json: async () => ({ action: "save", name: "Test", address: "Test", municipality: "Test", neighborhood: "Test", activist_id: "forged", leadership_id: "forged" }),
  });
  await t.test("new records use the signed activist identity despite another leader cookie", async () => {
    const response = await route.POST(request("activist"));
    assert.equal(response.status, 201);
    assert.equal(response.body.item.activistId, "activist");
    assert.equal(inserted.at(-1).activist_id, "activist");
    assert.equal(inserted.at(-1).leadership_id, "leader");
  });
  await t.test("administrator cookie also cannot override the activist", async () => {
    portal = { role: "admin", id: "admin" };
    assert.equal((await route.POST(request("activist"))).status, 201);
    assert.equal(inserted.at(-1).activist_id, "activist");
  });
  await t.test("reading keeps both ownership filters with simultaneous sessions", async () => {
    filters.length = 0;
    assert.equal((await route.GET(request("activist"))).status, 200);
    assert.ok(filters.some(([table, field, value]) => table === "families" && field === "activist_id" && value === "activist"));
    assert.ok(filters.some(([table, field, value]) => table === "families" && field === "leadership_id" && value === "leader"));
  });
  await t.test("audit failure cannot report a committed save as failed", async () => {
    auditThrows = true;
    assert.equal((await route.POST(request("activist"))).status, 201);
    auditThrows = false;
  });
  await t.test("missing or wrong activist session fails closed instead of using administrator", async () => {
    const count = inserted.length;
    activist = null;
    assert.equal((await route.POST(request("activist"))).status, 401);
    assert.equal((await route.GET(request("activist"))).status, 401);
    activist = { role: "leader", id: "forged" };
    assert.equal((await route.POST(request("activist"))).status, 401);
    assert.equal(inserted.length, count);
  });
  await t.test("portal leadership keeps its own identity; unsupported context is rejected", async () => {
    portal = { role: "leader", id: "portal-leader" };
    activist = { role: "activist", authMethod: "password-v1", id: "activist", leadershipId: "leader" };
    assert.equal((await route.POST(request())).status, 201);
    assert.equal(inserted.at(-1).activist_id, null);
    assert.equal(inserted.at(-1).leadership_id, "portal-leader");
    assert.equal((await route.POST(request("admin"))).status, 401);
  });
});

test("SMS recovery refuses simulated delivery and consumes the challenge", async () => {
  let mode = "test";
  let consumed = 0;
  let sent = 0;
  const db = {
    rpc: async () => ({ data: true, error: null }),
    from(table) {
      return {
        select() { return this; }, eq() { if (table === "password_recovery_challenges") consumed++; return this; },
        update() { return this; },
        maybeSingle: async () => ({ data: { id: "test-person", phone: "92999990000", archived_at: null }, error: null }),
      };
    },
  };
  const route = await loadRoute("../app/api/password-recovery/route.js", [
    ['import { SMSGo } from "@orynlabs/smsgo";', 'const { SMSGo } = globalThis.__accessRegression;'],
    ['import { NextResponse } from "next/server";', 'const { NextResponse } = globalThis.__accessRegression;'],
    ['import { hashPassword, normalizeCpf, supabaseAdmin } from "../../../lib/server-auth";', 'const { hashPassword, normalizeCpf, supabaseAdmin } = globalThis.__accessRegression;'],
    ['import { mobileNumber, newCode, recoveryHash, validPassword, RECOVERY_MESSAGE } from "../../../lib/password-recovery.mjs";', 'const { mobileNumber, newCode, recoveryHash, validPassword, RECOVERY_MESSAGE } = globalThis.__accessRegression;'],
  ], {
    NextResponse, supabaseAdmin: () => db, hashPassword: () => "test-hash", normalizeCpf: (value) => value,
    mobileNumber: () => "+5592999990000", newCode: () => "123456", recoveryHash: () => "test-hash",
    validPassword: () => true, RECOVERY_MESSAGE: "generic response",
    SMSGo: class { get mode() { return mode; } async send() { sent++; } },
  });
  const previousKey = process.env.SMSGO_KEY;
  const previousVercel = process.env.VERCEL;
  process.env.SMSGO_KEY = "test-only";
  delete process.env.VERCEL;
  try {
    const request = { url: "https://example.test/api/password-recovery", headers: new Headers({ "Content-Type": "application/json", origin: "https://example.test" }), json: async () => ({ action: "request", role: "leader", cpf: "00000000000" }) };
    assert.equal((await route.POST(request)).status, 503);
    assert.equal(consumed, 1);
    mode = "live";
    const response = await route.POST(request);
    assert.equal(response.status, 200);
    assert.equal(response.body.message, "generic response");
    assert.equal(consumed, 1);
    assert.equal(sent, 2);
  } finally {
    if (previousKey === undefined) delete process.env.SMSGO_KEY; else process.env.SMSGO_KEY = previousKey;
    if (previousVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previousVercel;
    delete globalThis.__accessRegression;
  }
});
