import { test } from "node:test";
import assert from "node:assert/strict";
import { startLiveRefresh } from "../lib/live-refresh.mjs";

function surfaces() {
  let id = 0;
  const timers = new Map();
  const listeners = new Map();
  const target = {
    navigator: { onLine: true },
    setTimeout(fn, ms) { timers.set(++id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(event, fn) { listeners.set(event, fn); },
    removeEventListener(event) { listeners.delete(event); },
  };
  const page = { ...target, visibilityState: "visible" };
  const tick = async () => {
    const [id, timer] = [...timers.entries()].sort((a, b) => a[1].ms - b[1].ms)[0];
    timers.delete(id); await timer.fn();
    await Promise.resolve(); await Promise.resolve();
  };
  return { target, page, timers, listeners, tick };
}

test("slow reads never overlap; cleanup aborts and rejects late results", async () => {
  const env = surfaces(); let resolve; let signal; let reads = 0; let applied = 0;
  const stop = startLiveRefresh({ ...env, isReady: () => true,
    read: s => { signal=s; reads++; return new Promise(r => { resolve=r; }); },
    apply: () => applied++, onError: () => {} });
  await env.tick();
  env.listeners.get("focus")(); env.listeners.get("online")();
  assert.equal(reads, 1);
  stop(); assert.equal(signal.aborted, true);
  resolve({}); await Promise.resolve(); await Promise.resolve();
  assert.equal(applied, 0); assert.equal(env.timers.size, 0);
});

test("failures retain current data, back off and recover without retrying writes", async () => {
  const env = surfaces(); let fail=true; let applied=0; let errors=0;
  const stop=startLiveRefresh({ ...env, isReady: () => true,
    read: async () => { if(fail)throw new Error("offline"); return {}; },
    apply: () => applied++, onError: () => errors++ });
  await env.tick();
  assert.equal(applied,0); assert.equal(errors,1);
  assert.equal([...env.timers.values()][0].ms,30000);
  fail=false; await env.tick();
  assert.equal(applied,1); assert.equal([...env.timers.values()][0].ms,15000);
  stop();
});

test("hidden or offline pages pause; reconnect and focus resume", async () => {
  const env=surfaces(); let reads=0;
  const stop=startLiveRefresh({ ...env,isReady:()=>true,read:async()=>{reads++;},apply:()=>{},onError:()=>{} });
  env.page.visibilityState="hidden"; await env.tick(); assert.equal(reads,0);
  env.page.visibilityState="visible"; env.target.navigator.onLine=false;
  env.listeners.get("visibilitychange")(); await Promise.resolve(); assert.equal(reads,0);
  env.target.navigator.onLine=true; env.listeners.get("online")();
  await Promise.resolve(); await Promise.resolve(); assert.equal(reads,1);
  stop();
});

test("pending mutations defer refresh with only one scheduled retry", async () => {
  const env=surfaces(); let ready=false; let reads=0;
  const stop=startLiveRefresh({...env,isReady:()=>ready,read:async()=>{reads++;},apply:()=>{},onError:()=>{} });
  await env.tick(); assert.equal(reads,0); assert.equal(env.timers.size,1);
  env.listeners.get("focus")(); assert.equal(env.timers.size,1);
  ready=true; await env.tick(); assert.equal(reads,1);
  stop();
});
