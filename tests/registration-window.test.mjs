import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COUNTDOWN_START, REGISTRATION_DEADLINE, REGISTRATION_CLOSED_MESSAGE, registrationsClosed, registrationWindow } from "../lib/registration-window.mjs";

test("Manaus countdown begins at midnight and closes precisely at 16h on October 4", () => {
  assert.equal(new Date(COUNTDOWN_START).toISOString(), "2026-10-04T04:00:00.000Z");
  assert.equal(new Date(REGISTRATION_DEADLINE).toISOString(), "2026-10-04T20:00:00.000Z");
  assert.equal(registrationWindow(COUNTDOWN_START - 1).visible, false);
  assert.deepEqual(registrationWindow(COUNTDOWN_START), { visible: true, closed: false, remainingSeconds: 57600 });
  assert.equal(registrationsClosed(REGISTRATION_DEADLINE - 1), false);
  assert.deepEqual(registrationWindow(REGISTRATION_DEADLINE), { visible: true, closed: true, remainingSeconds: 0 });
  assert.deepEqual(registrationWindow(REGISTRATION_DEADLINE + 86400000), { visible: true, closed: true, remainingSeconds: 0 });
});

test("all registration endpoints reject new people at deadline, retain existing records and still permit edits", async () => {
  let now = REGISTRATION_DEADLINE, role = "admin", writes = 0;
  const saved = { id: "existing", name: "Existing", cpf: "11111111111", leadership_id: "leader", municipality: "Manaus", neighborhood: "Centro" };
  const db = { from(table) { return {
    select() { return this; }, eq() { return this; },
    maybeSingle: async () => ({ data: table === "leaderships" ? { id: "leader", archived_at: null } : { ...saved } }),
    update(values) { writes++; Object.assign(saved, values); return this; },
    insert(values) { writes++; return this; },
    single: async () => ({ data: { ...saved } }),
    then(resolve) { resolve({ error: null }); },
  }; } };
  const bindings = {
    NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) },
    sessionFromRequest: () => role === "activist" ? null : { role, id: "leader" },
    verifySession: () => role === "activist" ? { role, id: "activist", leadershipId: "leader", authMethod: "password-v1" } : null,
    supabaseAdmin: () => db, registrationsClosed: () => registrationsClosed(now), REGISTRATION_CLOSED_MESSAGE,
    isDuplicateRegistration: () => false, hashPassword: () => "test-hash", normalizeCpf: v => v,
  };
  const load = async (file) => {
    let source = await readFile(new URL(file, import.meta.url), "utf8");
    source = source.replace(/^import .*;\r?\n/gm, "").replace('await import("../../../lib/server-auth")', '({ hashPassword: () => "test-hash" })');
    globalThis.__windowTest = bindings;
    return import(`data:text/javascript;base64,${Buffer.from(`const {${Object.keys(bindings).join(",")}} = globalThis.__windowTest;\n${source}`).toString("base64")}#${Math.random()}`);
  };
  const data = await load("../app/api/data/route.js"), families = await load("../app/api/families/route.js"), auth = await load("../app/api/auth/route.js");
  const request = (action, extra = {}) => ({ headers: { get: () => role === "activist" ? "activist" : null }, cookies: { get: () => ({ value: "test" }) }, json: async () => ({ action, name: "Person", cpf: "11111111111", leaderId: "leader", address: "Street", municipality: "Manaus", neighborhood: "Centro", ...extra }) });
  for (role of ["admin", "leader"]) {
    const result = await data.POST(request("save-activist"));
    assert.equal(result.status, 403); assert.equal(result.body.error, REGISTRATION_CLOSED_MESSAGE);
  }
  role = "admin";
  assert.equal((await data.POST(request("save-leadership"))).status, 403);
  assert.equal((await auth.POST(request("register-leadership"))).status, 403);
  for (role of ["admin", "leader", "activist"]) assert.equal((await families.POST(request("save"))).status, 403);
  assert.equal(writes, 0); assert.equal(saved.name, "Existing");
  for (role of ["admin", "leader", "activist"]) assert.equal((await families.POST(request("save", { id: "existing" }))).status, 200);
  role = "admin";
  for (const action of ["save-leadership", "save-activist"]) assert.equal((await data.POST(request(action, { id: "existing" }))).status, 200);
  now = REGISTRATION_DEADLINE - 1;
  assert.equal((await data.POST(request("save-activist"))).status, 201);
  assert.equal((await data.POST(request("save-leadership"))).status, 201);
  assert.equal((await families.POST(request("save"))).status, 201);
});
