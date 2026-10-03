import assert from 'node:assert/strict';
import test from 'node:test';
const module=await import('../apps/app/src/startup/essential-startup.ts').catch(()=>({}));
const {createEssentialFontLoader,createEssentialStartupGate,createNativeSplashHandoff}=module;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function fixture(load=async()=>{}){
 assert.equal(typeof createEssentialFontLoader,'function');assert.equal(typeof createEssentialStartupGate,'function');
 let time=0,timer,due;let loads=0;
 const fonts=createEssentialFontLoader(()=>{loads++;return load();});
 const options={deadlineMs:5000,clock:{now:()=>time,setTimeout:(fn,ms)=>{timer=fn;due=time+ms;return 1;},clearTimeout:()=>{timer=undefined;}}};
 const gate=createEssentialStartupGate(fonts,options);
 return{gate,fonts,options,loads:()=>loads,tick:async value=>{time=value;if(time>=due)timer?.();await flush();}};
}
test('font wait begins outside a stalled language provider and reaches readable recovery',async()=>{
 const f=fixture();f.gate.start();await flush();assert.equal(f.gate.snapshot().fontsReady,true);assert.equal(f.gate.snapshot().status,'pending');
 await f.tick(5000);assert.equal(f.gate.snapshot().status,'recovery');assert.equal(f.gate.snapshot().languageReady,false);
});
test('eventual language settlement can safely enter only after fonts succeeded',async()=>{
 const fonts=deferred();const f=fixture(()=>fonts.promise);f.gate.start();await f.tick(5000);f.gate.markLanguageReady();assert.equal(f.gate.snapshot().status,'recovery');
 fonts.resolve();await flush();assert.equal(f.gate.snapshot().status,'ready');
});
test('retry reuses the still-pending real font operation and is bounded again',async()=>{
 const fonts=deferred();const f=fixture(()=>fonts.promise);f.gate.start();await f.tick(5000);f.gate.retry();assert.equal(f.loads(),1);assert.equal(f.gate.snapshot().status,'pending');
 await f.tick(10000);assert.equal(f.gate.snapshot().status,'recovery');assert.equal(f.loads(),1);fonts.resolve();await flush();assert.equal(f.gate.snapshot().status,'recovery');f.gate.markLanguageReady();assert.equal(f.gate.snapshot().status,'ready');
});
test('failed font preparation never enters app and retry may start one new settled attempt',async()=>{
 const task=deferred();const f=fixture(()=>task.promise);f.gate.start();f.gate.markLanguageReady();task.reject(Error('asset'));await flush();assert.equal(f.gate.snapshot().status,'recovery');assert.equal(f.gate.snapshot().fontsReady,false);
 f.gate.retry();await flush();assert.equal(f.loads(),2);assert.equal(f.gate.snapshot().status,'recovery');
});
test('unmount rejects false entry and remount reuses actual font owner',async()=>{
 const fonts=deferred();const f=fixture(()=>fonts.promise);let entries=0;f.gate.subscribe(state=>{if(state.status==='ready')entries++;});f.gate.start();f.gate.markLanguageReady();f.gate.dispose();
 const remount=createEssentialStartupGate(f.fonts,f.options);remount.start();fonts.resolve();await flush();assert.equal(entries,0);assert.notEqual(f.gate.snapshot().status,'ready');assert.equal(remount.snapshot().status,'pending');remount.markLanguageReady();assert.equal(remount.snapshot().status,'ready');assert.equal(f.loads(),1);
});
test('readiness and settled font success remain idempotent on repeated starts',async()=>{
 const f=fixture();f.gate.start();f.gate.start();f.gate.markLanguageReady();await flush();assert.equal(f.gate.snapshot().status,'ready');f.gate.retry();await flush();assert.equal(f.loads(),1);
});
test('native splash hides only after readable content frame and retries a failed hide on later layout',async()=>{
 assert.equal(typeof createNativeSplashHandoff,'function');let hides=0;const handoff=createNativeSplashHandoff(async()=>{hides++;if(hides===1)throw Error('native');});
 assert.equal(hides,0);handoff.frameReady();await flush();assert.equal(hides,1);handoff.frameReady();await flush();assert.equal(hides,2);handoff.frameReady();await flush();assert.equal(hides,2);
});
test('concurrent layouts cannot duplicate the native hide operation',async()=>{
 assert.equal(typeof createNativeSplashHandoff,'function');const hide=deferred();let hides=0;const handoff=createNativeSplashHandoff(()=>{hides++;return hide.promise;});handoff.frameReady();handoff.frameReady();assert.equal(hides,1);hide.resolve();await flush();handoff.frameReady();assert.equal(hides,1);
});
test('a permanently rejected hide has at most three mounted retries and unmount clears retry timers',async()=>{
 let callback, hides=0;const clock={setTimeout:fn=>{callback=fn;return 1;},clearTimeout:()=>{callback=undefined;}};
 const handoff=createNativeSplashHandoff(async()=>{hides++;throw Error('native');},{clock});
 const runTimer=()=>{const current=callback;callback=undefined;current?.();};handoff.frameReady();await flush();runTimer();await flush();runTimer();await flush();
 assert.equal(hides,3);assert.equal(callback,undefined);
 const once=createNativeSplashHandoff(async()=>{hides++;throw Error('native');},{clock});once.frameReady();await flush();once.dispose();assert.equal(callback,undefined);
});
test('elapsed clock enforces recovery even when the timer is delivered late',async()=>{
 let now=0;const pending=deferred();const gate=createEssentialStartupGate(createEssentialFontLoader(()=>pending.promise),{deadlineMs:5000,clock:{now:()=>now,setTimeout:()=>1,clearTimeout(){}}});
 gate.start();now=6000;pending.resolve();await flush();assert.equal(gate.snapshot().status,'recovery');assert.equal(gate.snapshot().fontsReady,true);gate.markLanguageReady();assert.equal(gate.snapshot().status,'ready');
});
