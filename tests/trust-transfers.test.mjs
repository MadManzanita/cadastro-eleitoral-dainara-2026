import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { neighborhoodCounts } from "../lib/neighborhood-counts.mjs";

const id=(n)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const admin=id(1), l1=id(2), l2=id(3), a1=id(4), a2=id(5), f1=id(6), f2=id(7);
test("neighborhood totals normalize accents/case while keeping municipalities distinct",()=>{
 const result=neighborhoodCounts({leaderships:[{neighborhood:" São José "}],activists:[{neighborhood:"sao jose"}],families:[{neighborhood:"São José",municipality:"Manaus"},{neighborhood:"São José",municipality:"Parintins"},{}]});
 assert.equal(result.reduce((s,r)=>s+r.total,0),5);
 assert.equal(result.find(r=>r.municipality==="Município não informado"&&r.neighborhood!=="Sem bairro informado").total,2);
 assert.equal(result.length,4);
});
test("atomic trust transfers",async(t)=>{
 const db=new PGlite();
 await db.exec("create role anon; create role authenticated; create role service_role;");
 const read=async(path)=>readFile(new URL(path,import.meta.url),"utf8");
 await db.exec((await read("../supabase/schema.sql")).replace("create extension if not exists pgcrypto;",""));
 await db.exec(await read("../supabase/migrations/003_sms_challenges.sql"));
 const migration=await read("../supabase/migrations/010_bulk_trust_transfers.sql");
 await db.exec(migration); await db.exec(migration);
 await db.query("insert into admins(id,name,cpf,password_hash) values($1,'Admin','1','hash')",[admin]);
 await db.query("insert into leaderships(id,name,cpf,password_hash) values($1,'L1','2','hash'),($2,'L2','3','hash')",[l1,l2]);
 const reset=async()=>{
  await db.exec("delete from families; delete from activists; delete from trust_network_history; update leaderships set archived_at=null;");
  await db.query("insert into activists(id,leadership_id,name,cpf,pix) values($1,$2,'A1','4','saved-pix'),($3,$4,'A2','5',null)",[a1,l1,a2,l2]);
  await db.query("insert into families(id,leadership_id,activist_id,name,cpf) values($1,$2,$3,'Dependent','6'),($4,$2,null,'Direct','7')",[f1,l1,a1,f2]);
  await db.query("insert into sms_challenges(activist_id,leadership_id,phone,code_hash,expires_at) values($1,$2,'TRUST_PASSWORD','hash',now())",[a1,l1]);
 };
 const transfer=async(activists=[],families=[],role="leader",target=l2,actor=admin)=>(await db.query("select transfer_trust_registrations($1,$2::uuid[],$3::uuid[],$4,$5) as result",[actor,activists,families,role,target])).rows[0].result;
 const scalar=async(sql)=>Object.values((await db.query(sql)).rows[0])[0];
 await t.test("converts activist, moves all dependents once and preserves audit/personal data",async()=>{
  await reset(); const result=await transfer([a1],[f1,f2],"activist",a2);
  assert.equal(result.converted,1);assert.equal(result.moved,2);
  const rows=(await db.query("select * from families")).rows;
  assert.equal(rows.length,3); assert.ok(rows.every(r=>r.leadership_id===l2&&r.activist_id===a2));
  assert.equal(await scalar("select count(*)::int from activists"),1);
  assert.equal(await scalar("select count(*)::int from sms_challenges"),0);
  assert.equal(await scalar("select snapshot->'before'->>'pix' from trust_network_history where snapshot->>'operation'='convert-activist'"),"saved-pix");
 });
 await t.test("family transfer to leadership clears old activist ownership and keeps ID",async()=>{
  await reset();await transfer([],[f1]);
  const row=(await db.query("select * from families where id=$1",[f1])).rows[0];
  assert.equal(row.activist_id,null);assert.equal(row.leadership_id,l2);
  assert.equal((await transfer([],[f1])).moved,0);
 });
 await t.test("rejects self destination, archived targets, stale IDs and non-admin actors",async()=>{
  await reset();await assert.rejects(transfer([a1],[],"activist",a1),/destino/);
  await assert.rejects(transfer([],[id(99)]),/seleção/);
  await assert.rejects(transfer([],[f1],"leader",l2,l1),/administrativo/);
  await db.query("update leaderships set archived_at=now() where id=$1",[l2]);
  await assert.rejects(transfer([],[f1]),/ativo/);
  assert.equal((await db.query("select leadership_id from families where id=$1",[f1])).rows[0].leadership_id,l1);
 });
 await t.test("duplicate CPF aborts entire batch",async()=>{
  await reset();await db.query("update families set cpf='4' where id=$1",[f2]);
  await assert.rejects(transfer([a1],[f1]),/duplicidade/);
  assert.equal(await scalar("select count(*)::int from activists"),2);
 });
 await t.test("late insertion failure rolls back earlier dependent moves and audit",async()=>{
  await reset();await db.exec("create function reject_conversion() returns trigger language plpgsql as $$ begin raise exception 'simulated'; end; $$; create trigger reject_conversion before insert on families for each row execute function reject_conversion();");
  await assert.rejects(transfer([a1],[f2]),/simulated/);
  assert.equal((await db.query("select leadership_id from families where id=$1",[f1])).rows[0].leadership_id,l1);
  assert.equal(await scalar("select count(*)::int from trust_network_history"),0);
  assert.equal(await scalar("select count(*)::int from activists"),2);
  await db.exec("drop trigger reject_conversion on families; drop function reject_conversion();");
 });
 await t.test("RPC execution is forbidden to public clients",async()=>{
  assert.equal(await scalar("select has_function_privilege('anon','transfer_trust_registrations(uuid,uuid[],uuid[],text,uuid)','execute')"),false);
  assert.equal(await scalar("select has_function_privilege('authenticated','transfer_trust_registrations(uuid,uuid[],uuid[],text,uuid)','execute')"),false);
  assert.equal(await scalar("select has_function_privilege('service_role','transfer_trust_registrations(uuid,uuid[],uuid[],text,uuid)','execute')"),true);
 });
 await db.close();
});
