import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function loadRoute(path, imports, bindings) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
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
  const db = { from(table) {
    const result = { data: table === "leaderships" ? [{ id: "leader", name: "Test" }] : [], error: table === "trust_network_history" ? failure : null };
    const chain = { select() { return this; }, order() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { id: "leader", archived_at: null }, error: null }), then(resolve) { return Promise.resolve(result).then(resolve); } };
    return chain;
  } };
  const route = await loadRoute("../app/api/data/route.js", [
    ['import { NextResponse } from "next/server";', 'const { NextResponse } = globalThis.__accessRegression;'],
    ['import { sessionFromRequest, supabaseAdmin } from "../../../lib/server-auth";', 'const { sessionFromRequest, supabaseAdmin } = globalThis.__accessRegression;'],
    ['import { isDuplicateRegistration, isMissingOptionalHistory } from "../../../lib/database-errors";', 'const { isDuplicateRegistration, isMissingOptionalHistory } = globalThis.__accessRegression;'],
  ], { NextResponse, sessionFromRequest: () => ({ role, id: "leader" }), supabaseAdmin: () => db, ...errors });
  assert.equal((await route.GET({})).status, 200);
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
    return {
      select() { return this; }, order() { return this; }, eq(field, value) { filters.push([table, field, value]); return this; },
      maybeSingle: async () => ({ data: { id: "leader", archived_at: null }, error: null }),
      then(resolve) { return Promise.resolve({ data: [{ id: "family", activist_id: "activist", leadership_id: "leader", name: "Test" }], error: null }).then(resolve); },
    };
  } };
  const route = await loadRoute("../app/api/families/route.js", [
    ['import { NextResponse } from "next/server";', 'const { NextResponse } = globalThis.__accessRegression;'],
    ['import { sessionFromRequest, supabaseAdmin, verifySession } from "../../../lib/server-auth";', 'const { sessionFromRequest, supabaseAdmin, verifySession } = globalThis.__accessRegression;'],
    ['import { isDuplicateRegistration } from "../../../lib/database-errors";', 'const { isDuplicateRegistration } = globalThis.__accessRegression;'],
  ], { NextResponse, sessionFromRequest: () => null, verifySession: () => session, supabaseAdmin: () => db, ...errors });
  const request = { cookies: { get: () => ({ value: "test-cookie" }) } };
  const response = await route.GET(request);
  assert.equal(response.status, 200);
  assert.equal(response.body.items[0].id, "family");
  assert.ok(filters.some(([table, field, value]) => table === "families" && field === "activist_id" && value === "activist"));
  assert.ok(filters.some(([table, field, value]) => table === "families" && field === "leadership_id" && value === "leader"));
  session = null;
  assert.equal((await route.GET(request)).status, 401);
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
