import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source=await readFile(new URL("../app/familia/page.js",import.meta.url),"utf8");
const handler=source.slice(source.indexOf("  const saveFamily="),source.indexOf("  const editFamily="));
function setup(request) {
  const state={items:[],f:{name:"TEST",address:"TEST",municipality:"TEST",neighborhood:"TEST"},step:"form",msg:"",saving:false};
  const bindings={f:state.f,editing:null,savingLock:{current:false},empty:{name:""},cpfOK:()=>true,request,
    setMsg:v=>{state.msg=v;},setItems:fn=>{state.items=fn(state.items);},setEditing:()=>{},
    setF:v=>{state.f=v;},setStep:v=>{state.step=v;},setSaving:v=>{state.saving=v;}};
  const save=new Function(...Object.keys(bindings),`${handler};return saveFamily;`)(...Object.values(bindings));
  return {state,save};
}
test("double click sends once and confirmed save does not depend on another read",async()=>{
  let calls=0;let resolve;
  const {state,save}=setup(async()=>{calls++;return new Promise(r=>{resolve=r;});});
  const first=save({preventDefault(){}});
  await save({preventDefault(){}});
  assert.equal(calls,1);assert.equal(state.saving,true);
  resolve({item:{id:"saved",name:"TEST"}});await first;
  assert.equal(calls,1);assert.equal(state.step,"done");assert.equal(state.items[0].id,"saved");assert.equal(state.saving,false);
});
test("failed save preserves entered data and allows a later manual attempt",async()=>{
  let fail=true;let calls=0;
  const {state,save}=setup(async()=>{calls++;if(fail)throw new Error("Connection failed");return {item:{id:"saved"}};});
  await save({preventDefault(){}});
  assert.equal(state.f.name,"TEST");assert.equal(state.step,"form");assert.equal(state.saving,false);assert.equal(calls,1);
  fail=false;await save({preventDefault(){}});assert.equal(calls,2);assert.equal(state.step,"done");
});
