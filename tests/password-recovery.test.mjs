import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { mobileNumber, newCode, recoveryHash, validPassword } from "../lib/password-recovery.mjs";

const leader = "11111111-1111-4111-8111-111111111111";
const activist = "22222222-2222-4222-8222-222222222222";
const passwordHash = `${"a".repeat(32)}:${"b".repeat(128)}`;
const phone = "+5592999990000";

test("normalization accepts Brazilian mobile formats and rejects missing/landline/foreign phones", () => {
  for (const value of ["92999990000", "(92) 99999-0000", "+55 92 99999-0000"]) assert.equal(mobileNumber(value), phone);
  for (const value of [null, "", "9233334444", "+14155552671", "00000000000"]) assert.equal(mobileNumber(value), null);
});
test("codes use six digits; proof is keyed and bound to the challenge", () => {
  process.env.SESSION_SECRET = "test-only-secret".repeat(4);
  assert.match(newCode(), /^\d{6}$/);
  assert.notEqual(recoveryHash("one:123456"), recoveryHash("two:123456"));
  assert.equal(validPassword("12345678"), true);
  for (const value of ["1234567", "123456789", "abcd1234", 12345678]) assert.equal(validPassword(value), false);
});
test("PostgreSQL recovery transactions", async (t) => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table leaderships(id uuid primary key, phone text, archived_at timestamptz, password_hash text);
    create table activists(id uuid primary key, leadership_id uuid references leaderships(id), phone text);
    create table sms_challenges(id uuid primary key default gen_random_uuid(), activist_id uuid, leadership_id uuid,
      phone text, code_hash text, expires_at timestamptz, attempts int, created_at timestamptz default now());`);
  const migration = await readFile(new URL("../supabase/migrations/008_password_recovery.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration); // Safe to reapply.
  await db.query("insert into leaderships values ($1, $2, null, 'old')", [leader, phone]);
  await db.query("insert into activists values ($1, $2, $3)", [activist, leader, phone]);
  const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
  const reserve = async (role = "leader", person = leader) => {
    const id = crypto.randomUUID();
    await db.exec("update password_recovery_challenges set created_at = now() - interval '2 hours'");
    assert.equal(await scalar("select reserve_password_recovery($1,$2,$3,$4,$5)", [id, role, person, phone, "proof"]), true);
    return id;
  };
  const complete = (id, proof = "proof") => scalar("select complete_password_recovery($1,$2,$3)", [id, proof, passwordHash]);
  await t.test("leader password changes once; replay fails", async () => {
    const id = await reserve();
    assert.equal(await complete(id), true);
    assert.equal(await scalar("select password_hash from leaderships where id=$1", [leader]), passwordHash);
    assert.equal(await complete(id), false);
  });
  await t.test("wrong codes lock after five attempts even with later correct proof", async () => {
    const id = await reserve();
    for (let i = 0; i < 5; i++) assert.equal(await complete(id, "wrong"), false);
    assert.equal(await complete(id), false);
  });
  await t.test("expired and unknown challenges fail", async () => {
    const id = await reserve();
    await db.query("update password_recovery_challenges set expires_at=now()-interval '1 second' where id=$1", [id]);
    assert.equal(await complete(id), false);
    assert.equal(await complete(crypto.randomUUID()), false);
  });
  await t.test("changed phone invalidates code", async () => {
    const id = await reserve();
    await db.query("update leaderships set phone='92988880000' where id=$1", [leader]);
    assert.equal(await complete(id), false);
    await db.query("update leaderships set phone=$2 where id=$1", [leader, phone]);
  });
  await t.test("archived leader blocks both roles", async () => {
    const id = await reserve();
    await db.query("update leaderships set archived_at=now() where id=$1", [leader]);
    assert.equal(await complete(id), false);
    const aid = await reserve("activist", activist);
    assert.equal(await complete(aid), false);
    await db.query("update leaderships set archived_at=null where id=$1", [leader]);
  });
  await t.test("activist password uses existing login credential format", async () => {
    const id = await reserve("activist", activist);
    assert.equal(await complete(id), true);
    const credential = (await db.query("select * from sms_challenges where activist_id=$1", [activist])).rows[0];
    assert.equal(credential.phone, "TRUST_PASSWORD");
    assert.equal(credential.code_hash, passwordHash);
    assert.equal(credential.leadership_id, leader);
    assert.equal(await complete(id), false);
  });
  await t.test("resending invalidates the earlier challenge", async () => {
    const first = await reserve();
    const second = await reserve();
    assert.equal(await complete(first), false);
    assert.equal(await complete(second), true);
  });
  await t.test("phone throttle applies across roles and accounts", async () => {
    await reserve();
    assert.equal(await scalar("select reserve_password_recovery($1,'activist',$2,$3,'proof')", [crypto.randomUUID(), activist, phone]), false);
  });
  await t.test("per-account cooldown and hourly budget", async () => {
    assert.equal(await scalar("select allow_password_recovery_request('ip','account')"), true);
    assert.equal(await scalar("select allow_password_recovery_request('other-ip','account')"), false);
    for (let i = 0; i < 4; i++) {
      await db.exec("update password_recovery_requests set created_at=now()-interval '2 minutes'");
      assert.equal(await scalar("select allow_password_recovery_request('ip','account')"), true);
    }
    await db.exec("update password_recovery_requests set created_at=now()-interval '2 minutes'");
    assert.equal(await scalar("select allow_password_recovery_request('ip','account')"), false);
  });
  await t.test("IP budget blocks requests for many different accounts", async () => {
    for (let i = 0; i < 20; i++) assert.equal(await scalar("select allow_password_recovery_request('bulk-ip',$1)", [`a${i}`]), true);
    assert.equal(await scalar("select allow_password_recovery_request('bulk-ip','another')"), false);
  });
  await t.test("public roles cannot read challenges or call recovery functions", async () => {
    for (const role of ["anon", "authenticated"]) {
      assert.equal(await scalar("select has_table_privilege($1,'password_recovery_challenges','SELECT')", [role]), false);
      assert.equal(await scalar("select has_function_privilege($1,'complete_password_recovery(uuid,text,text)','EXECUTE')", [role]), false);
    }
  });
  await db.close();
});
