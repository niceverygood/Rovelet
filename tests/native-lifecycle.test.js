import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeLifecycle} from '../src/native-lifecycle.js';
import {createNativeHaptics} from '../src/native-haptics.js';
import {FrameSchedule} from '../src/frame-schedule.js';
import {JourneyAudio} from '../src/audio.js';
import {Game} from '../src/game.js';
import {TouchControls} from '../src/touch-controls.js';
import {freshSave,SAVE_KEY} from '../src/data.js';
import {RUN_KEY} from '../src/checkpoint.js';
import {villageStats} from '../src/village-stats.js';
import * as THREE from 'three';

const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
class Target{
 constructor(){this.hidden=false;this.listeners=[];}
 addEventListener(name,fn,capture=false){this.listeners.push({name,fn,capture});}
 removeEventListener(name,fn,capture=false){this.listeners=this.listeners.filter(r=>r.name!==name||r.fn!==fn||r.capture!==capture);}
 dispatch(name,extra={}){const event={cancelable:true,prevented:0,stopped:false,preventDefault(){this.prevented++;},stopImmediatePropagation(){this.stopped=true;},...extra};
  for(const r of [...this.listeners].filter(r=>r.name===name).sort((a,b)=>Number(b.capture)-Number(a.capture))){if(event.stopped)break;r.fn(event);}return event;}
}
function fakeClock(){let time=1000,id=0;const timers=new Map();return {now:()=>time,set(v){time=v;},setTimer(fn,ms){const key=++id;timers.set(key,{fn,at:time+ms});return key;},clearTimer(key){timers.delete(key);},advance(ms){time+=ms;for(const [key,t]of [...timers])if(t.at<=time){timers.delete(key);t.fn();}},timers};}
function fakeApp({state={isActive:true},listeners={}}={}){const callbacks=new Map(),removed=[],calls=[];return {
 callbacks,removed,calls,getState(){calls.push('getState');return typeof state==='function'?state():Promise.resolve(state);},
 addListener(name,fn){calls.push(name);callbacks.set(name,fn);if(listeners[name])return listeners[name](fn);const handle={remove(){removed.push(name);return Promise.resolve();}};return Promise.resolve(handle);},
 emit(name,value){callbacks.get(name)?.(value);}
};}
function harness(options={}){const {hooks:customHooks,...rest}=options,clock=fakeClock(),doc=new Target(),input=new Target(),app=options.app??fakeApp(),log=[];
 const hooks=Object.fromEntries(['frameReset','inputBlocked','clearInput','clearTouch','cancelGestures','pause','checkpoint','audioHidden'].map(name=>[name,(...args)=>{log.push([name,...args]);return name==='pause';}]));
 const adapter=createNativeLifecycle({mode:'native',platform:'android',app,document:doc,inputTarget:input,blurTarget:input,...clock,hooks:{...hooks,canBack:()=>true,escape:()=>log.push(['escape']),...customHooks},timeoutMs:50,...rest});
 return {clock,doc,input,app,log,adapter};}

test('web start is synchronous and inert: no App/DOM/clock/hooks; optional legacy haptics preserves result',async()=>{
 const fail=()=>{throw Error('Web touched native capability');},app=new Proxy({},{get:fail}),doc=new Proxy({},{get:fail});
 const adapter=createNativeLifecycle({mode:'web',app,document:doc,inputTarget:doc,now:fail,hooks:{frameReset:fail,escape:fail}});
 assert.equal(adapter.start(),adapter);assert.equal(adapter.start(),adapter);assert.equal(adapter.isHidden(),false);assert.equal(adapter.allowsInput(),true);assert.equal(adapter.requestBack(),false);
 assert.equal((await adapter.whenReady()).ready,true);await adapter.dispose();await adapter.dispose();
 let argument;const h=createNativeHaptics({mode:'web',invoke:fail,getSettings:fail,now:fail,legacy:kind=>{argument=kind;return 'legacy-result';}});
 assert.equal(h.vibrate('repair'),'legacy-result');assert.equal(argument,'repair');assert.equal(h.snapshot().stats.requested,0);
});

test('doc/native four-event interleaving deduplicates background hooks and never resumes a paused screen',async()=>{
 const f=harness();f.adapter.start();await f.adapter.whenReady();f.log.length=0;
 f.doc.hidden=true;f.doc.dispatch('visibilitychange');f.app.emit('pause');f.app.emit('appStateChange',{isActive:false});f.doc.hidden=false;f.doc.dispatch('visibilitychange');
 assert.equal(f.adapter.isHidden(),true);assert.equal(f.log.filter(x=>x[0]==='checkpoint').length,1);assert.equal(f.log.filter(x=>x[0]==='pause').length,1);
 f.app.emit('resume');f.app.emit('appStateChange',{isActive:true});assert.equal(f.adapter.isHidden(),false);
 assert.deepEqual(f.log.filter(x=>x[0]==='audioHidden'),[['audioHidden',true],['audioHidden',false]]);
 assert.equal(f.log.filter(x=>x[0]==='frameReset').length,2);assert.equal(f.log.filter(x=>x[0]==='pause').length,1);
 await f.adapter.dispose();assert.equal(f.doc.listeners.length,0);assert.equal(f.input.listeners.length,0);assert.equal(f.app.removed.length,4);
});

test('native-first and document-first inverse interleavings both stay blocked until both are visible',async()=>{
 for(const nativeFirst of [false,true]){const f=harness();f.adapter.start();await f.adapter.whenReady();f.log.length=0;
  if(nativeFirst){f.app.emit('pause');f.doc.hidden=true;f.doc.dispatch('visibilitychange');}else{f.doc.hidden=true;f.doc.dispatch('visibilitychange');f.app.emit('pause');}
  if(nativeFirst){f.app.emit('resume');assert.equal(f.adapter.isHidden(),true);f.doc.hidden=false;f.doc.dispatch('visibilitychange');}else{f.doc.hidden=false;f.doc.dispatch('visibilitychange');assert.equal(f.adapter.isHidden(),true);f.app.emit('resume');}
  assert.equal(f.adapter.isHidden(),false);assert.equal(f.log.filter(x=>x[0]==='checkpoint').length,1);await f.adapter.dispose();}
});

test('a stale getState cannot overwrite a newer inactive event, timeout or refresh generation',async()=>{
 const first=deferred(),second=deferred();let queries=0;const app=fakeApp({state:()=>++queries===1?first.promise:second.promise});const f=harness({app});
 f.adapter.start();app.emit('pause');first.resolve({isActive:true});await f.adapter.whenReady();assert.equal(f.adapter.isHidden(),true);
 const retry=f.adapter.refreshState();app.emit('resume');second.resolve({isActive:false});await retry;assert.equal(f.adapter.isHidden(),false);await f.adapter.dispose();
 const late=deferred(),g=harness({app:fakeApp({state:()=>late.promise})});g.adapter.start();await flush();g.clock.advance(51);await g.adapter.whenReady();assert.equal(g.adapter.snapshot().ready,false);
 late.resolve({isActive:true});await flush();assert.equal(g.adapter.isHidden(),true);g.app.emit('resume');assert.equal(g.adapter.isHidden(),false);await g.adapter.dispose();
});

test('failed state and missing lifecycle monitoring fail closed, usable pause/resume pair is sufficient',async()=>{
 const reject=()=>Promise.reject(Error('registration rejected'));
 const f=harness({app:fakeApp({state:()=>Promise.reject(Error('state rejected')),listeners:{appStateChange:reject,pause:reject,resume:reject}})});
 f.adapter.start();await f.adapter.whenReady();assert.equal(f.adapter.snapshot().ready,false);assert.equal(f.adapter.allowsInput(),false);assert.equal(f.adapter.requestBack(),false);await f.adapter.dispose();
 const g=harness({app:fakeApp({listeners:{appStateChange:reject}})});g.adapter.start();await g.adapter.whenReady();assert.equal(g.adapter.snapshot().ready,true);g.app.emit('pause');assert.equal(g.adapter.isHidden(),true);g.app.emit('resume');assert.equal(g.adapter.isHidden(),false);await g.adapter.dispose();
});

test('late registration handle is removed once after timeout/disposal and its callback is ignored',async()=>{
 const handle=deferred();let removed=0;const f=harness({app:fakeApp({listeners:{appStateChange:()=>handle.promise}})});
 f.adapter.start();f.clock.advance(51);await f.adapter.whenReady();const disposal=f.adapter.dispose();await disposal;
 handle.resolve({remove(){removed++;return Promise.reject(Error('late remove rejected'));}});await flush();
 f.app.emit('appStateChange',{isActive:false});assert.equal(removed,1);assert.equal(f.adapter.snapshot().disposed,true);await f.adapter.dispose();assert.equal(removed,1);
 assert.ok(f.adapter.snapshot().errors.some(e=>e.label==='remove:appStateChange'));
});

test('dispose before getState/handles settles invalidates all late results and bounded whenReady completes',async()=>{
 const state=deferred(),handles=Object.fromEntries(['appStateChange','pause','resume','backButton'].map(name=>[name,deferred()]));
 const app=fakeApp({state:()=>state.promise,listeners:Object.fromEntries(Object.entries(handles).map(([name,d])=>[name,()=>d.promise]))});const f=harness({app});
 f.adapter.start();const old=f.adapter.snapshot();await f.adapter.dispose();f.clock.advance(51);await f.adapter.whenReady();
 for(const [name,d]of Object.entries(handles))d.resolve({remove(){app.removed.push(name);return Promise.resolve();}});state.resolve({isActive:true});await flush();
 assert.equal(f.adapter.snapshot().hidden,old.hidden);assert.equal(f.adapter.snapshot().nativeKnown,false);assert.equal(app.removed.length,4);assert.equal(f.adapter.start(),f.adapter);
});

test('hook throws and accidental async rejection are contained; remaining cleanup still runs',async()=>{
 const errors=[];const f=harness({onError:e=>errors.push(e),hooks:{clearInput(){throw Error('clear failed');},checkpoint(){return Promise.reject(Error('save rejected'));}}});
 f.adapter.start();await f.adapter.whenReady();f.app.emit('pause');await flush();assert.equal(f.adapter.isHidden(),true);assert.ok(f.log.some(x=>x[0]==='audioHidden'&&x[1]));
 assert.ok(errors.some(e=>e.label==='clearInput'));assert.ok(errors.some(e=>e.label==='checkpoint'));await f.adapter.dispose();
});

test('capture guard blocks hidden keyboard/pointer/button events before legacy handlers, releases in foreground',async()=>{
 const f=harness();let legacy=0;f.input.addEventListener('keydown',()=>legacy++);f.adapter.start();await f.adapter.whenReady();f.input.dispatch('keydown');assert.equal(legacy,1);
 f.app.emit('pause');for(const name of ['keydown','keyup','pointerdown','pointermove','pointerup','click']){const e=f.input.dispatch(name);assert.equal(e.stopped,true);assert.equal(e.prevented,1);}
 assert.equal(legacy,1);f.app.emit('resume');f.input.dispatch('keydown');assert.equal(legacy,2);await f.adapter.dispose();f.input.dispatch('keydown');assert.equal(legacy,3);
});

test('Android Back delegates once for a burst, respects pending/boot/hidden gates and iOS registers none',async()=>{
 const pending=deferred();let routes=0,enabled=false;const f=harness({hooks:{canBack:()=>enabled,escape:()=>{routes++;return pending.promise;}}});
 f.adapter.start();await f.adapter.whenReady();f.app.emit('backButton');assert.equal(routes,0);enabled=true;f.app.emit('backButton');f.app.emit('backButton');assert.equal(routes,1);
 f.clock.advance(51);await flush();assert.equal(f.adapter.snapshot().backPending,true);f.clock.advance(200);assert.equal(f.adapter.requestBack(),false);assert.equal(routes,1);
 pending.resolve();await flush();f.app.emit('pause');assert.equal(f.adapter.requestBack(),false);f.app.emit('resume');assert.equal(f.adapter.requestBack(),true);await flush();assert.equal(routes,2);await f.adapter.dispose();
 const g=harness({platform:'ios'});g.adapter.start();await g.adapter.whenReady();assert.equal(g.app.calls.includes('backButton'),false);assert.equal(g.adapter.requestBack(),false);await g.adapter.dispose();
});

test('Back sync throw and Promise rejection are caught without history/exit fallback or reentrant routes',async()=>{
 let count=0;const f=harness({hooks:{escape(){count++;if(count===1)throw Error('sync');return Promise.reject(Error('async'));}}});f.adapter.start();await f.adapter.whenReady();
 assert.equal(f.adapter.requestBack(),false);f.clock.advance(121);assert.equal(f.adapter.requestBack(),true);assert.equal(f.adapter.requestBack(),false);await flush();
 assert.equal(f.adapter.snapshot().backPending,false);assert.equal(count,2);assert.equal(f.adapter.snapshot().errors.filter(e=>e.label==='escape').length,2);await f.adapter.dispose();
});

function element(){const stick={style:{}};return {hidden:false,style:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},querySelector:()=>stick};}
function gameFixture(){
 const saved=Object.fromEntries(['window','document','localStorage'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)])),window=new Target(),document=new Target();
 document.createElement=element;document.documentElement={lang:'ko'};document.title='';document.body={append(){}};document.querySelector=()=>null;
 const store=new Map(),writes=[];const storage={getItem:k=>store.get(k)??null,setItem(k,v){store.set(k,String(v));writes.push(['set',k]);},removeItem(k){store.delete(k);writes.push(['remove',k]);}};
 const save=freshSave();save.settings.sound=false;store.set(SAVE_KEY,JSON.stringify(save));Object.assign(globalThis,{window,document,localStorage:storage});
 const world={actors:new THREE.Group(),cameraTarget:new THREE.Vector3(),updateBuildings(){},setHome(){},clearActors(){this.actors.clear();},castle(){const root=new THREE.Group();root.userData.model=new THREE.Group();root.add(root.userData.model);this.actors.add(root);return root;},cancelPreview(){},puff(){},update(){},feedback:{stats:{playerHits:0},impact(){},impulse(){},damageNumber(){},cameraKick(){}}};
 const game=new Game(world),touch=new TouchControls(game);let renders=0;game.ui={renderScreen(){renders++;},toast(){},update(){},flash(){}};
 game.mode='run';game.screen='';game.run={id:'native-adapter-actual-run',stageId:'meadow-1',duration:360,time:49.9,stage:1,level:2,hp:200,maxHp:220,coins:7,kills:3,xp:0,weapons:{cannon:1},cooldowns:{cannon:.1},villageStats:villageStats(game.save),outcome:null,choices:[],boostCd:0,boostTime:0,shieldCd:0,shieldTime:0,repairCd:0,invuln:0,slowTime:0};
 const key=()=>window.dispatch('keydown',{code:'Escape',repeat:false,target:null});
 return {game,world,touch,window,document,store,writes,key,renders:()=>renders,restore(){for(const [k,d]of Object.entries(saved))if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}};
}

test('native Back calls actual Game Escape callback for run/modal/placement/mandatory/terminal screens',async()=>{
 const g=gameFixture();try{const f=harness({hooks:{canBack:()=>true,escape:g.key}});f.adapter.start();await f.adapter.whenReady();
  const press=async()=>{f.clock.advance(121);assert.equal(f.adapter.requestBack(),true);await flush();};
  await press();assert.equal(g.game.screen,'pause');await press();assert.equal(g.game.screen,'');
  for(const [screen,result]of [['settings','pause'],['reference','pause'],['credits','title'],['replace-run','prepare']]){g.game.screen=screen;g.game.returnScreen='pause';g.game.creditReturn='title';g.game.replaceReturn='prepare';await press();assert.equal(g.game.screen,result);}
  let cancelled=0;g.game.placement={};g.game.cancelPlacement=()=>{cancelled++;g.game.placement=null;};await press();assert.equal(cancelled,1);
  let tutorial=0,ending=0;g.game.closeTutorial=()=>tutorial++;g.game.closeEnding=()=>ending++;g.game.screen='tutorial';await press();g.game.screen='ending';await press();assert.deepEqual([tutorial,ending],[1,1]);
  for(const screen of ['upgrade','result']){g.game.screen=screen;const before=JSON.stringify(g.game.run);await press();assert.equal(g.game.screen,screen);assert.equal(JSON.stringify(g.game.run),before);}
  assert.equal(g.writes.length,0);await f.adapter.dispose();
 }finally{g.restore();}
});

test('actual Game checkpoint/touch/audio and FrameSchedule preserve HP/time, one hidden transition, hour return dt0',async()=>{
 const g=gameFixture();try{const clock=fakeClock(),doc=new Target(),app=fakeApp(),scheduler=new FrameSchedule(clock.now());let resets=0,checkpoints=0;
  const adapter=createNativeLifecycle({mode:'native',app,document:doc,...clock,hooks:{frameReset:stamp=>{resets++;scheduler.reset(stamp);},clearInput:()=>g.game.keys.clear(),clearTouch:()=>g.touch.clear(),
   pause(){if(g.game.mode==='run'&&!g.game.screen){g.game.show('pause');return true;}return false;},checkpoint(){if(g.game.mode==='run'){checkpoints++;return g.game.checkpointRun();}},audioHidden:hidden=>g.game.audioManager.setHidden(hidden)}});
  adapter.start();await adapter.whenReady();g.game.show('');checkpoints=0;resets=0;g.writes.length=0;g.game.keys.add('KeyW');g.touch.pointer=11;g.game.touchInput={throttle:1,steer:1};
  let suspended=0,stopped=0;g.game.audio={state:'running',suspend(){suspended++;this.state='suspended';return Promise.resolve();}};
  g.game.audioManager.voices=[{tone:{stop(){stopped++;}},overtone:{stop(){stopped++;}}}];
  const run=structuredClone(g.game.run),save=structuredClone(g.game.save);app.emit('pause');doc.hidden=true;doc.dispatch('visibilitychange');app.emit('appStateChange',{isActive:false});
  assert.equal(checkpoints,1);assert.equal(g.game.screen,'pause');assert.equal(g.game.keys.size,0);assert.equal(g.touch.pointer,null);assert.deepEqual(g.game.touchInput,{throttle:0,steer:0});assert.equal(g.game.audioManager.hidden,true);
  assert.deepEqual(g.game.run,run);assert.deepEqual(g.game.save,save);assert.equal(JSON.parse(g.store.get(RUN_KEY)).run.id,run.id);assert.equal(suspended,1);assert.equal(stopped,2);
  clock.advance(3600000);assert.equal(scheduler.step(clock.now(),{mode:'run',screen:'pause',hidden:adapter.isHidden()}),null);
  doc.hidden=false;doc.dispatch('visibilitychange');assert.equal(adapter.isHidden(),true);app.emit('resume');assert.equal(adapter.isHidden(),false);assert.equal(g.game.screen,'pause');assert.equal(checkpoints,1);assert.equal(resets,2);
  assert.equal(scheduler.step(clock.now(),{mode:'run',screen:'pause',hidden:adapter.isHidden()}),0);g.game.update(0);assert.deepEqual(g.game.run,run);
  g.game.show('');clock.advance(10);assert.equal(scheduler.step(clock.now(),{mode:'run',screen:'',hidden:adapter.isHidden()}),0);await adapter.dispose();
 }finally{g.restore();}
});

test('background preserves upgrade/result and blur checkpoints only a newly paused active run',async()=>{
 const g=gameFixture();try{let checkpoints=0;const f=harness({hooks:{pause(){if(g.game.mode==='run'&&!g.game.screen){g.game.show('pause');return true;}return false;},checkpoint(){checkpoints++;}}});f.adapter.start();await f.adapter.whenReady();
  for(const screen of ['upgrade','result']){g.game.screen=screen;f.app.emit('pause');assert.equal(g.game.screen,screen);f.app.emit('resume');}
  const before=checkpoints;f.adapter.blur();assert.equal(checkpoints,before);g.game.screen='';f.adapter.blur();f.adapter.blur();assert.equal(checkpoints,before+1);assert.equal(g.game.screen,'pause');await f.adapter.dispose();
 }finally{g.restore();}
});

test('native haptics preserves actual JourneyAudio setting/hidden/120ms and hit pattern gates; sound mute independent',async()=>{
 const perf=Object.getOwnPropertyDescriptor(globalThis,'performance'),nav=Object.getOwnPropertyDescriptor(globalThis,'navigator');let stamp=0;const legacy=[];
 Object.defineProperty(globalThis,'performance',{value:{now:()=>stamp},configurable:true});Object.defineProperty(globalThis,'navigator',{value:{vibrate:pattern=>{legacy.push(pattern);return true;}},configurable:true});
 try{const game={save:{settings:{vibration:true,sound:false}}},audio=new JourneyAudio(game),requests=[],gate={};let hidden=false;
  const native=createNativeHaptics({mode:'native',getSettings:()=>game.save.settings,isHidden:()=>hidden,now:()=>stamp,gate,invoke:request=>{requests.push(request);return Promise.resolve();}});
  for(stamp of [0,119,120,239,240]){assert.equal(native.vibrate('hit'),audio.vibrate('hit'));await flush();}
  assert.equal(requests.length,3);assert.deepEqual(requests.map(r=>[...r.pattern]),legacy);assert.equal(native.snapshot().stats.acknowledged,3);assert.equal(native.snapshot().physicalConfirmed,false);
  stamp=400;hidden=true;audio.hidden=true;assert.equal(native.vibrate(),false);assert.equal(audio.vibrate(),false);hidden=false;audio.hidden=false;game.save.settings.vibration=false;assert.equal(native.vibrate(),false);assert.equal(audio.vibrate(),false);
  game.save.settings.vibration=true;stamp=500;assert.equal(native.vibrate('repair'),true);assert.equal(audio.vibrate('repair'),true);await flush();assert.deepEqual(requests.at(-1).pattern,[12]);assert.equal(legacy.at(-1),12);native.dispose();
 }finally{if(perf)Object.defineProperty(globalThis,'performance',perf);else delete globalThis.performance;if(nav)Object.defineProperty(globalThis,'navigator',nav);else delete globalThis.navigator;}
});

test('haptics sync/async failures keep the 120ms reservation with no legacy fallback',async()=>{
 let stamp=1000,calls=0,legacy=0;const errors=[],h=createNativeHaptics({mode:'native',now:()=>stamp,isHidden:()=>false,getSettings:()=>({vibration:true}),legacy:()=>legacy++,invoke(){calls++;if(calls===1)throw Error('sync');return Promise.reject(Error('async'));},onError:e=>errors.push(e)});
 assert.equal(h.vibrate(),false);stamp+=119;assert.equal(h.vibrate(),false);stamp++;assert.equal(h.vibrate(),true);await flush();assert.equal(h.snapshot().stats.rejected,2);assert.equal(legacy,0);assert.equal(calls,2);assert.equal(errors.length,2);h.dispose();assert.equal(h.vibrate(),false);
});

test('timed-out haptics stays single-flight until real settlement, late resolve does not count physical/ack success',async()=>{
 const clock=fakeClock(),pending=deferred();let calls=0;const h=createNativeHaptics({mode:'native',...clock,timeoutMs:50,isHidden:()=>false,getSettings:()=>({vibration:true}),invoke:()=>{calls++;return pending.promise;}});
 assert.equal(h.vibrate(),true);clock.advance(51);assert.equal(h.snapshot().stats.timedOut,1);clock.advance(1000);assert.equal(h.vibrate(),false);assert.equal(calls,1);
 pending.resolve();await flush();assert.equal(h.snapshot().pending,false);assert.equal(h.snapshot().stats.acknowledged,0);assert.equal(h.vibrate(),true);h.dispose();await flush();assert.equal(clock.timers.size,0);
});

test('actual takeDamage invokes native once only after shield/invulnerability gates, damage/slow/hitStop match legacy',async()=>{
 const g=gameFixture();try{const clock=fakeClock(),requests=[];const h=createNativeHaptics({mode:'native',...clock,getSettings:()=>({vibration:true}),isHidden:()=>false,invoke:r=>{requests.push(r);return Promise.resolve();}});
  g.game.audioManager.vibrate=kind=>h.vibrate(kind);g.game.combatSound=()=>{};g.game.run.shieldTime=1;g.game.takeDamage(17,{slow:.8});assert.equal(requests.length,0);assert.equal(g.game.run.hp,200);
  g.game.run.shieldTime=0;g.game.run.invuln=1;g.game.takeDamage(17,{slow:.8});assert.equal(requests.length,0);g.game.run.invuln=0;
  let legacyHits=0;const old=Object.assign(Object.create(Game.prototype),{run:structuredClone(g.game.run),save:g.game.save,player:g.game.player,clock:g.game.clock,hitStop:g.game.hitStop,
   world:{feedback:{...g.world.feedback,stats:{playerHits:0}}},ui:g.game.ui,audioManager:{vibrate:()=>legacyHits++},combatSound(){}});
  g.game.takeDamage(17,{slow:.8});old.takeDamage(17,{slow:.8});await flush();assert.deepEqual(g.game.run,old.run);assert.equal(g.game.hitStop,old.hitStop);assert.equal(legacyHits,1);
  assert.equal(requests.length,1);assert.equal(g.game.run.hp,183);assert.equal(g.game.run.slowFactor,.8);assert.equal(g.game.run.slowTime,2.2);assert.equal(g.game.hitStop,.055);
  g.game.takeDamage(17);assert.equal(requests.length,1);assert.equal(g.game.run.hp,183);assert.equal(g.writes.length,0);h.dispose();
 }finally{g.restore();}
});

test('required native cleanup hooks cannot silently produce a ready adapter',()=>{
 for(const missing of ['frameReset','clearInput','clearTouch','pause','checkpoint','audioHidden']){
  const hooks=Object.fromEntries(['frameReset','clearInput','clearTouch','pause','checkpoint','audioHidden'].filter(n=>n!==missing).map(n=>[n,()=>{}]));
  assert.throws(()=>createNativeLifecycle({mode:'native',hooks}),new RegExp(missing));
 }
});

test('explicit state retry succeeds after rejection; older concurrent refresh never overwrites the newest response',async()=>{
 const first=deferred(),second=deferred();let count=0;const app=fakeApp({state:()=>{count++;return count===1?Promise.reject(Error('first')):count===2?first.promise:second.promise;}}),f=harness({app});
 f.adapter.start();await f.adapter.whenReady();assert.equal(f.adapter.snapshot().ready,false);assert.equal(f.adapter.allowsInput(),false);
 const old=f.adapter.refreshState(),newest=f.adapter.refreshState();second.resolve({isActive:true});await newest;assert.equal(f.adapter.isHidden(),false);
 first.resolve({isActive:false});await old;assert.equal(f.adapter.isHidden(),false);await f.adapter.dispose();
});

test('unsubscribe wait is bounded even for a stuck remove Promise, disposed callbacks stay inert',async()=>{
 const pending=deferred(),app=fakeApp({listeners:{pause:()=>Promise.resolve({remove:()=>pending.promise})}}),f=harness({app});f.adapter.start();await f.adapter.whenReady();
 const log=f.log.length,dispose=f.adapter.dispose();f.clock.advance(51);await dispose;app.emit('resume');app.emit('pause');assert.equal(f.log.length,log);assert.equal(f.adapter.allowsInput(),false);
 pending.reject(Error('late removal reject'));await flush();assert.ok(f.adapter.snapshot().errors.some(e=>e.label==='remove:pause'));
});

test('async diagnostic sinks cannot create unhandled rejections and a disposed native coordinator stays closed',async()=>{
 const f=harness({onError:()=>Promise.reject(Error('diagnostic sink')),hooks:{checkpoint(){throw Error('checkpoint');}}});
 f.adapter.start();await f.adapter.whenReady();assert.equal(f.adapter.isHidden(),false);await flush();await f.adapter.dispose();assert.equal(f.adapter.isHidden(),true);assert.equal(f.adapter.snapshot().ready,false);
 const h=createNativeHaptics({mode:'native',getSettings:()=>({vibration:true}),isHidden:()=>false,now:()=>1000,invoke:()=>Promise.reject(Error('backend')),
  onError:()=>Promise.reject(Error('diagnostic sink'))});assert.equal(h.vibrate(),true);await flush();assert.equal(h.snapshot().stats.rejected,1);h.dispose();
});
