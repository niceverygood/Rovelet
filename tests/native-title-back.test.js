import test from 'node:test';
import assert from 'node:assert/strict';
import {bindNativeRuntime,prepareNativeRuntime} from '../src/native-runtime.js';
import {Game} from '../src/game.js';
const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
class Target{
 constructor(){this.hidden=false;this.listeners=new Map();}
 addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);}
 removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}
 emit(name){for(const fn of this.listeners.get(name)??[])fn();}
}
// Declared procedural owner fixture; real bind/lifecycle and real Game.handleEscape body.
// No scene, RAF, AudioContext, Capacitor bridge, Preferences, OS or SDK is run.
async function fixture({platform='android',minimize=()=>Promise.resolve(),missing=false}={}){
 const doc=new Target(),input=new Target(),callbacks=new Map(),rows=[],timers=new Map(),cp=new Map();let stamp=1000,tid=0,cpCount=0,captures=0;
 const app={getState:async()=>({isActive:true}),addListener:async(name,fn)=>{callbacks.set(name,fn);return {remove:async()=>callbacks.delete(name)};}};
 if(!missing)app.minimizeApp=function(){assert.equal(this,app);rows.push('minimize');return minimize();};
 const game={nativeMode:true,nativeInputBlocked:true,nativeCriticalPending:false,nativeCriticalHeld:false,mode:'title',screen:'title',placement:null,
  keys:new Set(),save:{settings:{language:'en',vibration:false}},run:{id:'title-back-fixture',time:17,hp:200,coins:4,kills:2,outcome:null},
  construction:{wake(){rows.push('wake');}},audioManager:{hidden:true,setHidden(v){this.hidden=v;rows.push(['hidden',v]);}},
  storage:{getItem:key=>cp.get(key)??null},checkpointRun(){cpCount++;this.checkpoint={run:{id:this.run.id}};cp.set('wandering-hearth:run',JSON.stringify(this.checkpoint));return true;},
  show(screen){this.screen=screen;this.keys.clear();rows.push(['show',screen]);},makeHome(){rows.push('home');},
  cancelPlacement(){this.placement=null;this.show('village');},closeWeaponLab(){this.mode='village';this.show('village');},
  closeTutorial(){this.show('pause');},closeEnding(){this.show('title');},
  handleEscape(){rows.push('escape');return Game.prototype.handleEscape.call(this);}};
 const ui={inputReady:true,syncInteraction(){},renderScreen(){rows.push('render');},toast(text){rows.push(['toast',text]);},touchControls:{clear(){},setActive(){}}};
 let result=Promise.resolve({nativeAck:true,durable:false});
 const session={snapshot:()=>({degradedBackup:false}),captureCritical(accepted){captures++;return Object.freeze({id:captures,localAccepted:accepted});},flushLatest(){return result;},retry(){return result;}};
 const owner=await bindNativeRuntime({game,ui,world:{villageCamera:{cancel(){}}},frameSchedule:{reset(){}},session,app,platform,document:doc,inputTarget:input,blurTarget:input,now:()=>stamp,
  lifecycleOptions:{timeoutMs:2000,setTimer(fn){const id=++tid;timers.set(id,fn);return id;},clearTimer:id=>timers.delete(id)}});
 assert.equal(owner.lifecycle.snapshot().ready,true);assert.equal(game.nativeInputBlocked,false);
 const baseline={run:JSON.stringify(game.run),save:JSON.stringify(game.save),cpCount};
 function stable(){assert.equal(JSON.stringify(game.run),baseline.run);assert.equal(JSON.stringify(game.save),baseline.save);}
 return {game,ui,app,owner,doc,callbacks,rows,timers,cp,baseline,stable,cpCount:()=>cpCount,captures:()=>captures,
  next(ms=121){stamp+=ms;},native(name,value){callbacks.get(name)?.(value);},setSaveResult(v){result=v;},
  counts:()=>({minimize:rows.filter(r=>r==='minimize').length,escape:rows.filter(r=>r==='escape').length}),
  async close(){await owner.dispose();assert.equal(callbacks.size,0);stable();}};
}

test('installed-listener-shaped Android Title Back requests one minimize without Escape, CP or state mutation',async()=>{
 const f=await fixture();try{assert.equal(f.callbacks.has('backButton'),true);f.native('backButton',{canGoBack:false});await flush();assert.deepEqual(f.counts(),{minimize:1,escape:0});assert.equal(f.owner.lifecycle.snapshot().stats.backRequests,1);assert.equal(f.cpCount(),0);assert.equal(f.game.mode,'title');assert.equal(f.game.screen,'title');assert.equal(f.game.keys.size,0);f.stable();}finally{await f.close();}
});

test('Title settings/reference/credits first close through real Escape and only a later Title Back minimizes',async()=>{
 for(const screen of ['settings','reference','credits']){const f=await fixture();try{f.game.screen=screen;f.game.returnScreen='title';f.game.creditReturn='title';assert.equal(f.owner.lifecycle.requestBack(),true);await flush();assert.equal(f.game.screen,'title');assert.deepEqual(f.counts(),{minimize:0,escape:1});f.next();assert.equal(f.owner.lifecycle.requestBack(),true);await flush();assert.deepEqual(f.counts(),{minimize:1,escape:1});assert.equal(f.cpCount(),0);}finally{await f.close();}}
});

test('run, village, lab, tutorial, upgrade/result, ending and replacement keep common Escape semantics',async()=>{
 const cases=[['run','','pause'],['run','pause',''],['village','village','village'],['lab','collection','village'],['run','tutorial','pause'],['run','upgrade','upgrade'],['run','result','result'],['title','ending','title'],['run','replace-run','prepare']];
 for(const [mode,screen,expected]of cases){const f=await fixture();try{f.game.mode=mode;f.game.screen=screen;assert.equal(f.owner.lifecycle.requestBack(),true);await flush();assert.equal(f.game.screen,expected);assert.deepEqual(f.counts(),{minimize:0,escape:1});assert.equal(f.cpCount(),0);f.stable();}finally{await f.close();}}
});

test('even a stale Title placement object preserves real placement cancel priority',async()=>{
 const f=await fixture();try{f.game.placement={fixture:true};assert.equal(f.owner.lifecycle.requestBack(),true);await flush();assert.equal(f.game.placement,null);assert.equal(f.game.screen,'village');assert.deepEqual(f.counts(),{minimize:0,escape:1});}finally{await f.close();}
});

test('input-ready and each existing native critical/input gate block both routes',async()=>{
 const f=await fixture();try{f.ui.inputReady=false;assert.equal(f.owner.lifecycle.requestBack(),false);f.ui.inputReady=true;for(const key of ['nativeInputBlocked','nativeCriticalPending','nativeCriticalHeld']){f.game[key]=true;assert.equal(f.owner.lifecycle.requestBack(),false);f.game[key]=false;}await flush();assert.deepEqual(f.counts(),{minimize:0,escape:0});assert.equal(f.cpCount(),0);}finally{await f.close();}
});

test('real held manual-save owner blocks Back while pending and after failure, cancellation restores common route',async()=>{
 const f=await fixture();try{f.game.mode='run';f.game.screen='pause';const pending=deferred();f.setSaveResult(pending.promise);const flight=f.owner.saveTitle.request();assert.equal(f.game.nativeCriticalHeld,true);assert.equal(f.game.nativeCriticalPending,true);assert.equal(f.owner.lifecycle.requestBack(),false);await flush();pending.resolve({nativeAck:false,state:'native-pending'});await flight;assert.equal(f.game.nativeCriticalHeld,true);assert.equal(f.game.nativeCriticalPending,false);assert.equal(f.owner.lifecycle.requestBack(),false);assert.equal(f.cpCount(),1);assert.equal(f.captures(),1);assert.equal(f.owner.saveTitle.cancel(),true);const raw=f.cp.get('wandering-hearth:run');assert.equal(f.owner.lifecycle.requestBack(),true);await flush();assert.equal(f.game.screen,'');assert.deepEqual(f.counts(),{minimize:0,escape:1});assert.equal(f.cp.get('wandering-hearth:run'),raw);assert.equal(f.cpCount(),1);}finally{await f.close();}
});

test('hidden document/native pause block Title Back; actual owner foreground gate resumes eligibility',async()=>{
 const f=await fixture();try{f.doc.hidden=true;f.doc.emit('visibilitychange');assert.equal(f.owner.lifecycle.requestBack(),false);f.native('pause');f.doc.hidden=false;f.doc.emit('visibilitychange');assert.equal(f.owner.lifecycle.requestBack(),false);f.native('resume');assert.equal(f.owner.lifecycle.requestBack(),true);await flush();assert.deepEqual(f.counts(),{minimize:1,escape:0});assert.equal(f.cpCount(),0);}finally{await f.close();}
});

test('existing 120ms Back reservation applies to minimize without changing its exact boundary',async()=>{
 const f=await fixture();try{assert.equal(f.owner.lifecycle.requestBack(),true);await flush();f.next(119);assert.equal(f.owner.lifecycle.requestBack(),false);f.next(1);assert.equal(f.owner.lifecycle.requestBack(),true);await flush();assert.deepEqual(f.counts(),{minimize:2,escape:0});assert.equal(f.owner.lifecycle.snapshot().stats.backRequests,2);}finally{await f.close();}
});

test('unresolved minimize stays single-flight even after existing timeout, and late resolution unlocks normally',async()=>{
 const pending=deferred(),f=await fixture({minimize:()=>pending.promise});try{assert.equal(f.owner.lifecycle.requestBack(),true);await flush();assert.equal(f.owner.lifecycle.snapshot().backPending,true);f.next();assert.equal(f.owner.lifecycle.requestBack(),false);for(const timer of [...f.timers.values()])timer();assert.ok(f.owner.lifecycle.snapshot().errors.some(e=>e.label==='escape'&&e.message.includes('remains locked')));assert.equal(f.owner.lifecycle.requestBack(),false);assert.deepEqual(f.counts(),{minimize:1,escape:0});pending.resolve();await flush();assert.equal(f.owner.lifecycle.snapshot().backPending,false);assert.equal(f.owner.lifecycle.requestBack(),true);await flush();assert.equal(f.counts().minimize,2);assert.equal(f.cpCount(),0);}finally{pending.resolve();await flush();await f.close();}
});

test('minimize rejection is observed by existing lifecycle, with no exit/save/fallback and later retry permitted',async()=>{
 let calls=0;const f=await fixture({minimize:()=>++calls===1?Promise.reject(Error('fixture minimize rejection')):Promise.resolve()});try{assert.equal(f.owner.lifecycle.requestBack(),true);await flush();assert.equal(f.owner.lifecycle.snapshot().backPending,false);assert.ok(f.owner.lifecycle.snapshot().errors.some(e=>e.label==='escape'&&e.message==='fixture minimize rejection'));assert.deepEqual(f.counts(),{minimize:1,escape:0});f.next();assert.equal(f.owner.lifecycle.requestBack(),true);await flush();assert.equal(f.counts().minimize,2);assert.equal(f.cpCount(),0);}finally{await f.close();}
});

test('synchronous minimize throw uses existing error/unlock policy; absent method falls back without throwing',async()=>{
 const f=await fixture({minimize:()=>{throw Error('fixture minimize throw');}});try{assert.equal(f.owner.lifecycle.requestBack(),false);assert.equal(f.owner.lifecycle.snapshot().backPending,false);assert.ok(f.owner.lifecycle.snapshot().errors.some(e=>e.message==='fixture minimize throw'));assert.deepEqual(f.counts(),{minimize:1,escape:0});}finally{await f.close();}
 const missing=await fixture({missing:true});try{assert.equal(missing.owner.lifecycle.requestBack(),true);await flush();assert.deepEqual(missing.counts(),{minimize:0,escape:1});assert.equal(missing.owner.lifecycle.snapshot().errors.length,0);}finally{await missing.close();}
});

test('iOS/web/disposed owners never minimize or register an Android route',async()=>{
 const ios=await fixture({platform:'ios'});try{assert.equal(ios.callbacks.has('backButton'),false);assert.equal(ios.owner.lifecycle.requestBack(),false);assert.deepEqual(ios.counts(),{minimize:0,escape:0});}finally{await ios.close();}
 let nativeLoads=0;assert.equal(prepareNativeRuntime({Capacitor:{isNativePlatform:()=>false},loadApp:()=>nativeLoads++}),null);assert.equal(nativeLoads,0);
 const dead=await fixture();await dead.close();assert.equal(dead.owner.lifecycle.requestBack(),false);assert.deepEqual(dead.counts(),{minimize:0,escape:0});
});
