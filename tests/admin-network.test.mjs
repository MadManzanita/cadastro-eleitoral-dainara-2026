import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const NextResponse={json:(body,options={})=>({body,status:options.status||200})};
const uuid="11111111-1111-4111-8111-111111111111";
async function route(file,bindings){
 let source=await readFile(new URL(file,import.meta.url),"utf8");
 source=source.replace(/^import .*;\r?\n/gm,"");
 globalThis.__adminNetwork=bindings;
 source='const {NextResponse,sessionFromRequest,supabaseAdmin,verifySession,fetchAllRows,isDuplicateRegistration}=globalThis.__adminNetwork;\n'+source;
 return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Math.random()}`);
}
test("transfer endpoint permits only administrator and validates the complete request",async()=>{
 let session=null,calls=0,args;
 const handler=await route("../app/api/trust-transfers/route.js",{NextResponse,sessionFromRequest:()=>session,supabaseAdmin:()=>({rpc:async(name,p)=>{calls++;args=p;return {data:{converted:0,moved:1}};}})});
 const request=(body,context=null)=>({headers:{get:()=>context},json:async()=>body});
 const body={activistIds:[],familyIds:[uuid,uuid],targetRole:"leader",targetId:uuid,p_actor:"forged"};
 assert.equal((await handler.POST(request(body))).status,401);
 session={role:"leader",id:uuid};assert.equal((await handler.POST(request(body))).status,403);
 session={role:"admin",id:uuid};assert.equal((await handler.POST(request(body,"activist"))).status,403);
 assert.equal((await handler.POST(request({...body,targetId:"invalid"}))).status,400);
 assert.equal(calls,0);assert.equal((await handler.POST(request(body))).status,200);
 assert.equal(args.p_actor,uuid);assert.deepEqual(args.p_families,[uuid]);
});
test("administrator creation assigns active leadership server-side and rejects archived destination",async()=>{
 let archived=false,inserted;
 const db={from(table){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{id:uuid,archived_at:archived?"now":null}}),insert(data){if(table==="families")inserted=data;return this;},single:async()=>({data:{id:uuid,...inserted}}),then(resolve){resolve({error:null});}};}};
 const handler=await route("../app/api/families/route.js",{NextResponse,sessionFromRequest:()=>({role:"admin",id:"admin-id"}),verifySession:()=>null,supabaseAdmin:()=>db,isDuplicateRegistration:()=>false});
 const body={action:"save",leaderId:uuid,name:"Test",address:"Street",municipality:"Manaus",neighborhood:"Centro"};
 const request=(data)=>({headers:{get:()=>null},cookies:{get:()=>null},json:async()=>data});
 assert.equal((await handler.POST(request({...body,leaderId:null}))).status,400);
 archived=true;assert.equal((await handler.POST(request(body))).status,400);assert.equal(inserted,undefined);
 archived=false;assert.equal((await handler.POST(request(body))).status,201);
 assert.equal(inserted.leadership_id,uuid);assert.equal(inserted.activist_id,null);
});

test("administrator can create in a linked activist network and cannot choose an unrelated or missing activist",async()=>{
 let activist={id:'activist-id',leadership_id:uuid},inserted;
 const db={from(table){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:table==='activists'?activist:{id:uuid,archived_at:null}}),insert(data){if(table==='families')inserted=data;return this;},single:async()=>({data:{id:uuid,...inserted}}),then(resolve){resolve({error:null});}};}};
 const handler=await route('../app/api/families/route.js',{NextResponse,sessionFromRequest:()=>({role:'admin',id:'admin-id'}),verifySession:()=>null,supabaseAdmin:()=>db,isDuplicateRegistration:()=>false});
 const request=()=>({headers:{get:()=>null},cookies:{get:()=>null},json:async()=>({action:'save',leaderId:uuid,activistId:'activist-id',name:'Test',address:'Street',municipality:'Manaus',neighborhood:'Centro'})});
 const result=await handler.POST(request());
 assert.equal(result.status,201);assert.equal(result.body.item.activistId,'activist-id');assert.equal(inserted.leadership_id,uuid);
 inserted=undefined;activist={id:'activist-id',leadership_id:'other-leader'};
 assert.equal((await handler.POST(request())).status,400);assert.equal(inserted,undefined);
 activist=null;assert.equal((await handler.POST(request())).status,400);assert.equal(inserted,undefined);
});

test("leadership and activist edits persist municipality and return it to the dashboard",async()=>{
 let written;
 const db={from(){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{id:uuid}}),update(data){written=data;return this;},single:async()=>({data:{id:uuid,...written}})};}};
 const handler=await route("../app/api/data/route.js",{NextResponse,sessionFromRequest:()=>({role:'admin',id:uuid}),supabaseAdmin:()=>db,isDuplicateRegistration:()=>false});
 for(const action of ['save-leadership','save-activist']) {
  const result=await handler.POST({json:async()=>({action,id:uuid,leaderId:uuid,name:'Test',cpf:'11111111111',municipality:'Careiro',manausZone:'',neighborhood:'Centro'})});
  assert.equal(result.status,200);assert.equal(written.municipality,'Careiro');assert.equal(result.body.item.municipality,'Careiro');
 }
});
