import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import * as P from '../src/persistence.js';import * as C from '../src/checkpoint.js';
import * as OldP from './fixtures/native-persistence-before.js';import * as OldC from './fixtures/native-checkpoint-before.js';
import {Game} from '../src/game.js';import {ConstructionRuntime} from '../src/construction-runtime.js';
import {getStorage,installStorage,readFive,SAVE_KEYS} from '../src/storage-accessor.js';
import {createNativePersistenceSession,prepareNativePersistence,NATIVE_SAVE_COPY} from '../src/native-persistence.js';
import {freshSave,SAVE_KEY} from '../src/data.js';
import {villageStats} from '../src/village-stats.js';
import {prepareConstructionStart} from '../src/construction.js';
import * as THREE from 'three';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';

const hash=async text=>createHash('sha256').update(text,'utf8').digest('hex'),turn=()=>new Promise(resolve=>setImmediate(resolve));
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function storage(entries=[]){const map=new Map(entries),ops=[];let failure=null;return {map,ops,fail:fn=>{failure=fn;},getItem(k){ops.push(['get',k]);if(failure?.('get',k))throw Error('read');return map.get(k)??null;},setItem(k,v){ops.push(['set',k,String(v)]);if(failure?.('set',k))throw Error('quota');map.set(k,String(v));},removeItem(k){ops.push(['remove',k]);if(failure?.('remove',k))throw Error('remove');map.delete(k);}};}
function backend(){const map=new Map(),ops=[];let hook=null;return {map,ops,hook:fn=>{hook=fn;},async get({key}){ops.push(['get',key]);if(hook){const value=await hook('get',key);if(value!==undefined)return value;}return {value:map.get(key)??null};},async set({key,value}){ops.push(['set',key,value]);if(hook)await hook('set',key,value);map.set(key,value);}};}
const profile=(coins=140)=>({...freshSave(),coins});
function cp(id='B',save=profile()){return {version:1,run:{id,stageId:'meadow-1',stage:2,time:15.5,hp:123,maxHp:220,coins:7,kills:2,level:4,xp:3,weapons:{cannon:1},cooldowns:{cannon:.25},choices:[],boostCd:0,boostTime:0,shieldCd:0,shieldTime:0,repairCd:0,invuln:0,slowTime:0,villageStats:villageStats(save),settled:false,outcome:null},position:[3,.2,-4],rotation:1.3,enemies:[],loot:[]};}
const session=(s,p,options={})=>createNativePersistenceSession({storage:s,backend:p,sha256:hash,scope:'qa.integration.v1',timeoutMs:1000,...options});
async function globals(s,fn){const saved=Object.fromEntries(['localStorage','window','document'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 Object.assign(globalThis,{localStorage:s,window:{addEventListener(){}},document:{hidden:false,documentElement:{lang:'ko'},title:'',addEventListener(){}}});
 try{return await fn();}finally{for(const [k,d]of Object.entries(saved))if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
function world(){return {actors:new THREE.Group(),cameraTarget:new THREE.Vector3(),home:{visible:true},residents:{people:[]},updateBuildings(){},clearActors(){this.actors.clear();},setHome(){},cancelPreview(){},castle(){const root=new THREE.Group();root.userData.model=new THREE.Group();root.add(root.userData.model);this.actors.add(root);return root;}};}
const poison={getItem(){throw Error('Global storage bypass');},setItem(){throw Error('Global storage bypass');},removeItem(){throw Error('Global storage bypass');}};

test('no installed override: actual legacy synchronous returns, five bytes and IO order remain equal',async()=>{
 async function flow(p,c){const s=storage([[SAVE_KEY,JSON.stringify(profile())]]);return globals(s,()=>{
  const loaded=p.loadSave(),a=p.saveGame({...loaded,coins:200}),saved=c.saveCheckpoint(cp('web',loaded),loaded),checkpoint=c.loadCheckpoint(loaded),settled=p.commitSettlement(loaded,{id:'A',outcome:'retreat',coins:9,kills:2,time:10,villageStats:villageStats(loaded)});c.clearCheckpoint();
  return {a,saved,checkpoint,settled,bytes:[...s.map],ops:s.ops};});}
 assert.deepEqual(await flow(P,C),await flow(OldP,OldC));
 const s=storage();s.fail(op=>op==='set');await globals(s,()=>{assert.equal(P.saveGame(profile()),false);assert.equal(OldP.saveGame(profile()),false);});
});

test('accessor defaults route all five keys through installed port, including pending quota and CP tombstones',async()=>{
 const s=storage([[SAVE_KEY,JSON.stringify(profile())]]),p=backend(),m=session(s,p);await globals(poison,async()=>{
  assert.equal((await m.boot()).localReady,true);assert.equal(getStorage(),m.port);
  const save=P.loadSave();assert.equal(C.saveCheckpoint(cp('B',save),save),true);s.fail((op,k)=>op==='set'&&k===SAVE_KEY);
  const result=P.commitSettlement(save,{id:'A',outcome:'retreat',coins:7,kills:2,time:15,villageStats:villageStats(save)});assert.equal(result.ok,false);assert.ok(s.map.get(SAVE_KEY+':pending'));
  await turn();const raw=m.port.lastTicket.snapshot;assert.ok(new Map(raw).get(SAVE_KEY+':pending'));assert.ok(new Map(raw).get(C.RUN_KEY));s.fail(null);
  assert.equal(P.saveGame(result.save),true);m.port.removeItem(SAVE_KEY+':pending');C.clearCheckpoint();const ack=await m.flushLatest(true);assert.equal(ack.nativeAck,true);
  const entries=new Map(ack.barrier.ticket.snapshot);assert.equal(entries.get(SAVE_KEY+':pending'),null);assert.equal(entries.get(C.RUN_KEY),null);m.dispose();
 });
});

test('actual Game injected storage reaches load/CP/failed settlement/retry direct pending remove without global IO',async()=>{
 const s=storage([[SAVE_KEY,JSON.stringify({...profile(),settings:{...profile().settings,sound:false}})]]),p=backend(),m=session(s,p);await globals(poison,async()=>{
  await m.boot();const g=new Game(world(),{storage:m.port});g.ui={renderScreen(){},toast(){}};assert.equal(g.storage,m.port);assert.equal(g.construction.storage,m.port);assert.equal(g.save.coins,140);
  g.mode='run';g.screen='';g.run=cp('A',g.save).run;g.player.root.position.fromArray([3,.2,-4]);g.enemies=[];g.loot=[];assert.equal(g.checkpointRun(),true);
  s.fail((op,k)=>op==='set'&&k===SAVE_KEY);g.finish('retreat');assert.equal(g.run.settled,false);assert.ok(s.map.get(SAVE_KEY+':pending'));const expected=g.save.coins;
  s.fail(null);assert.equal(g.retrySettlement(),undefined);assert.equal(g.run.settled,true);assert.equal(g.save.coins,expected);assert.equal(s.map.get(SAVE_KEY+':pending'),undefined);
  const ack=await m.flushLatest(true);assert.equal(ack.nativeAck,true);assert.equal(new Map(ack.barrier.ticket.snapshot).get(C.RUN_KEY),null);m.dispose();
 });
});

test('prototype Game callers without a storage field preserve accessor defaults and retry tombstone routing',async()=>{
 const s=storage([[SAVE_KEY,JSON.stringify(profile())]]),p=backend(),m=session(s,p);await globals(poison,async()=>{
  await m.boot();const g=Object.assign(Object.create(Game.prototype),{save:profile(201),run:{settled:false},checkpoint:{},ui:{renderScreen(){},toast(){}}});
  m.port.setItem(SAVE_KEY+':pending','pending');g.retrySettlement();assert.equal(g.run.settled,true);assert.equal(s.map.get(SAVE_KEY+':pending'),undefined);assert.equal((await m.flushLatest(true)).nativeAck,true);m.dispose();
 });
});

test('construction default prefers game storage and preserves both old CP stats before completion profile',async()=>{
 const save=profile(1000);save.buildings.smithy=1;const proposal=prepareConstructionStart(save,'smithy',{id:'job',now:0}),pending=proposal.next;
 assert.equal(proposal.ok,true);const legacy=cp('B',save);delete legacy.run.villageStats;
 const s=storage([[SAVE_KEY,JSON.stringify(pending)],[C.RUN_KEY,JSON.stringify(legacy)],[C.RUN_KEY+':backup',JSON.stringify(legacy)]]),p=backend(),m=session(s,p);await globals(poison,async()=>{
  await m.boot();const g={save:pending,storage:m.port,mode:'run',run:{id:'live',villageStats:villageStats(save)},world:{home:{visible:false}}};const before=structuredClone(g.run);
  const runtime=new ConstructionRuntime(g,{wallNow:()=>100000,monotonicNow:()=>100000});assert.equal(runtime.storage,m.port);assert.equal(runtime.flush(true),true);assert.deepEqual(g.run,before);
  const ack=await m.flushLatest(true);assert.equal(ack.nativeAck,true);for(const key of [C.RUN_KEY,C.RUN_KEY+':backup'])assert.deepEqual(JSON.parse(new Map(ack.barrier.ticket.snapshot).get(key)).run.villageStats,villageStats(save));
  assert.equal(g.save.buildings.smithy,save.buildings.smithy+1);m.dispose();
 });
});

test('web entry returns null synchronously with no storage access, dynamic loaders or native delay',()=>{
 let calls=0;const options={Capacitor:{isNativePlatform:()=>false},get storage(){throw Error('Web storage read');},loadPreferences(){calls++;throw Error('Import');},loadNoble(){calls++;throw Error('Import');}};
 assert.equal(prepareNativePersistence(options),null);assert.equal(calls,0);assert.equal(prepareNativePersistence({Capacitor:{}}),null);
 assert.throws(()=>prepareNativePersistence({Capacitor:{isNativePlatform(){throw Error('Bridge detection');}}}),/Bridge detection/);
});

test('confirmed-empty initializes actual profile once before first CP; native queue has profile then CP',async()=>{
 const s=storage(),p=backend(),m=session(s,p);await globals(poison,async()=>{
  const result=await m.boot();assert.equal(result.localReady,true);assert.equal(result.initializedFresh,true);assert.ok(P.normalizeSave(JSON.parse(s.map.get(SAVE_KEY))));
  const first=s.ops.filter(x=>x[0]==='set'&&x[1]===SAVE_KEY).length;assert.equal((await m.boot()).initializedFresh,false);assert.equal(s.ops.filter(x=>x[0]==='set'&&x[1]===SAVE_KEY).length,first);
  const save=P.loadSave();assert.equal(C.saveCheckpoint(cp('first',save),save),true);assert.equal((await m.flushLatest(true)).nativeAck,true);
  const writes=p.ops.filter(x=>x[0]==='set').map(x=>new Map(JSON.parse(x[2]).entries));assert.ok(writes.length>=2);assert.ok(writes[0].get(SAVE_KEY));assert.equal(writes[0].get(C.RUN_KEY),null);assert.ok(writes.at(-1).get(C.RUN_KEY));m.dispose();
 });
});

test('valid local profile with native rejection installs degraded port; retry does not overwrite local bytes',async()=>{
 const raw=JSON.stringify(profile(222)),s=storage([[SAVE_KEY,raw]]),p=backend();let fail=true;p.hook(op=>{if(fail&&op==='get')throw Error('Preferences rejected');});const m=session(s,p);
 await globals(poison,async()=>{const result=await m.boot();assert.equal(result.localReady,true);assert.equal(result.degradedBackup,true);assert.equal(result.initializedFresh,false);assert.equal(s.map.get(SAVE_KEY),raw);
  assert.equal(s.ops.some(x=>x[0]==='set'),false);P.saveGame(profile(333));const barrier=m.captureCritical(true);assert.equal((await m.flushLatest(true,barrier)).nativeAck,false);
  fail=false;assert.equal((await m.retry(barrier)).nativeAck,true);assert.equal(JSON.parse(s.map.get(SAVE_KEY)).coins,333);assert.equal(s.map.has(C.RUN_KEY),false);m.dispose();});
});

test('invalid local/native failures and fresh quota rejection remain fail closed, retry writes no invented save',async()=>{
 const corrupt=storage([[SAVE_KEY,'broken']]),p=backend();p.hook(op=>{if(op==='get')throw Error('unreadable');});const m=session(corrupt,p);const prior=getStorage();
 assert.equal((await m.boot()).localReady,false);assert.equal(getStorage(),prior);assert.equal(corrupt.map.get(SAVE_KEY),'broken');assert.equal(corrupt.ops.some(x=>x[0]==='set'),false);m.dispose();
 const s=storage(),native=backend(),n=session(s,native);s.fail((op,k)=>op==='set'&&k===SAVE_KEY);assert.equal((await n.boot()).state,'fresh-local-rejected');assert.equal(getStorage(),prior);assert.equal(native.ops.some(x=>x[0]==='set'),false);
 s.fail(null);assert.equal((await n.boot()).localReady,true);assert.equal((await n.flushLatest(true)).nativeAck,true);assert.ok(s.map.get(SAVE_KEY));n.dispose();
});

test('critical false/Promise do not capture; same-ticket retry does not repeat the actual local transaction',async()=>{
 const s=storage([[SAVE_KEY,JSON.stringify(profile())]]),p=backend(),m=session(s,p);await m.boot();let reject=true;p.hook(op=>{if(reject&&op==='set')throw Error('native write');});
 const io=s.ops.length;assert.equal(m.captureCritical(false).localAccepted,false);assert.equal((await m.flushLatest(Promise.resolve(true))).nativeAck,false);assert.equal(s.ops.length,io);
 let transactions=0;const accepted=m.transaction(()=>{transactions++;return P.saveGame(profile(444));}),ticket=m.captureCritical(accepted);const first=await m.flushLatest(accepted,ticket);assert.equal(first.nativeAck,false);
 reject=false;const retry=await m.retry(ticket);assert.equal(retry.nativeAck,true);assert.equal(retry.barrier,ticket);assert.equal(transactions,1);assert.equal(JSON.parse(s.map.get(SAVE_KEY)).coins,444);
 assert.equal((await m.retry({localAccepted:true,ticket:ticket.ticket})).nativeAck,false);m.dispose();
});

test('local change during native await makes old ack unusable for UI; current barrier completes separately',async()=>{
 const s=storage([[SAVE_KEY,JSON.stringify(profile())]]),p=backend(),hold=defer();let held=true;p.hook(op=>op==='set'&&held?hold.promise:undefined);const m=session(s,p);await m.boot();
 P.saveGame(profile(200));const old=m.captureCritical(true),pending=m.flushLatest(true,old);P.saveGame(profile(300));const current=m.captureCritical(true);held=false;hold.resolve();
 const answer=await pending;assert.equal(answer.nativeAck,false);assert.equal(answer.state,'stale-critical-target');assert.equal((await m.flushLatest(true,current)).nativeAck,true);assert.equal((await m.retry(old)).state,'stale-critical-target');m.dispose();
});

test('default pending A recovery retains unrelated B CP through routed loadSave and native five-key snapshot',async()=>{
 const save=profile(),journal={id:'A',outcome:'retreat',coins:7,kills:2,time:15,villageStats:villageStats(save)},s=storage([[SAVE_KEY,JSON.stringify(save)],[SAVE_KEY+':pending',JSON.stringify(journal)],[C.RUN_KEY,JSON.stringify(cp('B',save))]]),p=backend(),m=session(s,p);
 await globals(poison,async()=>{await m.boot();const first=P.loadSave(),second=P.loadSave();assert.equal(first.runs,1);assert.equal(first.coins,second.coins);assert.equal(second.runs,1);assert.equal(C.loadCheckpoint(second).run.id,'B');
  const ack=await m.flushLatest(true);assert.equal(ack.nativeAck,true);assert.equal(new Map(ack.barrier.ticket.snapshot).get(SAVE_KEY+':pending'),null);assert.equal(JSON.parse(new Map(ack.barrier.ticket.snapshot).get(C.RUN_KEY)).run.id,'B');m.dispose();});
});

test('native-only dependency loading uses actual pinned noble fallback vectors and import rejection stays retryable',async()=>{
 const noble=text=>bytesToHex(sha256(new TextEncoder().encode(text)));for(const text of ['', 'abc','한글 🏰'])assert.equal(noble(text),await hash(text));
 const s=storage([[SAVE_KEY,JSON.stringify(profile())]]),p=backend();let imports=0,hashLoads=0,fail=true;
 const prepared=await prepareNativePersistence({Capacitor:{isNativePlatform:()=>true},storage:s,cryptoProvider:{},loadPreferences:async()=>{imports++;if(fail)throw Error('Import unavailable');return {Preferences:p};},loadNoble:async()=>{hashLoads++;return noble;},timeoutMs:1000});
 assert.equal(prepared.result.localReady,true);assert.equal(prepared.result.degradedBackup,true);assert.equal(hashLoads,1);P.saveGame(profile(202));const barrier=prepared.session.captureCritical(true);fail=false;
 assert.equal((await prepared.session.retry(barrier)).nativeAck,true);assert.equal(imports,2);assert.equal(hashLoads,1);prepared.session.dispose();
});

test('dispose releases only its accessor owner and late native success cannot authorize a stale UI',async()=>{
 const other={},remove=installStorage(other),s=storage([[SAVE_KEY,JSON.stringify(profile())]]),p=backend(),hold=defer(),m=session(s,p);await m.boot();P.saveGame(profile(201));const ticket=m.captureCritical(true);
 p.hook(op=>op==='set'?hold.promise:undefined);const flush=m.flushLatest(true,ticket);m.dispose();assert.equal(getStorage(),other);hold.resolve();assert.equal((await flush).nativeAck,false);assert.equal((await m.flushLatest(true)).state,'disposed');remove();
 assert.equal(NATIVE_SAVE_COPY.ko.retry,'다시 시도');assert.equal(typeof NATIVE_SAVE_COPY.en.blocked,'string');assert.equal(SAVE_KEYS.length,5);
});

async function seedRemote(p,entries,revision=7){const scope='qa.integration.v1',values=new Map(entries),snapshot=SAVE_KEYS.map(key=>[key,values.get(key)??null]),digest=await hash(JSON.stringify([1,scope,revision,snapshot]));
 const raw=JSON.stringify({schema:1,scope,revision,entries:snapshot,digest});p.map.set(scope+':snapshot:A',raw);return {raw,digest,revision,scope};}

test('boot await external valid profile/CP wins both native restore and confirmed-empty approval without local writes',async()=>{
 for(const remotePresent of [false,true]){const s=storage(),p=backend(),hold=defer();if(remotePresent)await seedRemote(p,[[SAVE_KEY,JSON.stringify(profile(900))],[C.RUN_KEY,JSON.stringify(cp('native'))]]);
  p.hook(op=>op==='get'?hold.promise:undefined);const m=session(s,p),boot=m.boot();await turn();P.saveGame(profile(333),s);C.saveCheckpoint(cp('external',profile(333)),profile(333),s);
  const before=readFive(s),ops=s.ops.length;hold.resolve();const result=await boot;assert.equal(result.localReady,true);assert.equal(result.source,'local');assert.equal(result.restored,false);assert.equal(result.changedDuringBoot,true);
  assert.deepEqual(readFive(s),before);assert.equal(s.ops.slice(ops).some(x=>x[0]!=='get'),false);assert.equal(C.loadCheckpoint(P.loadSave(s),s).run.id,'external');assert.equal(p.ops.some(x=>x[0]==='set'),false);m.dispose();
 }
});

test('boot await external invalid mixed five-key snapshot fails closed without restoring or creating a profile',async()=>{
 const s=storage(),p=backend(),hold=defer();await seedRemote(p,[[SAVE_KEY,JSON.stringify(profile(900))]]);p.hook(op=>op==='get'?hold.promise:undefined);
 const m=session(s,p),boot=m.boot();await turn();s.setItem(C.RUN_KEY,JSON.stringify(cp('external')));s.setItem(SAVE_KEY,'corrupt external profile');const before=readFive(s),ops=s.ops.length;
 hold.resolve();assert.equal((await boot).localReady,false);assert.deepEqual(readFive(s),before);assert.equal(s.ops.slice(ops).some(x=>x[0]!=='get'),false);assert.equal(m.snapshot().ready,false);m.dispose();
});

test('interrupted restore marker changed during query is fail closed even if current profile becomes valid',async()=>{
 const s=storage([[SAVE_KEY,'partial']]),p=backend(),remote=await seedRemote(p,[[SAVE_KEY,JSON.stringify(profile(900))]]),hold=defer();
 const markerKey=remote.scope+':restore';s.setItem(markerKey,JSON.stringify({schema:1,scope:remote.scope,revision:remote.revision,digest:remote.digest}));p.hook(op=>op==='get'?hold.promise:undefined);
 const m=session(s,p),boot=m.boot();await turn();s.setItem(SAVE_KEY,JSON.stringify(profile(222)));s.removeItem(markerKey);const before=[...s.map],ops=s.ops.length;
 hold.resolve();assert.equal((await boot).localReady,false);assert.deepEqual([...s.map],before);assert.equal(s.ops.slice(ops).some(x=>x[0]!=='get'),false);assert.equal(p.map.get(remote.scope+':snapshot:A'),remote.raw);m.dispose();
});

test('new external restore marker cannot be ignored just because current profile is valid',async()=>{
 const s=storage(),p=backend(),hold=defer();await seedRemote(p,[[SAVE_KEY,JSON.stringify(profile())]]);p.hook(op=>op==='get'?hold.promise:undefined);const m=session(s,p),boot=m.boot();await turn();
 s.setItem(SAVE_KEY,JSON.stringify(profile(123)));s.setItem('qa.integration.v1:restore','new external marker');const before=[...s.map],ops=s.ops.length;hold.resolve();assert.equal((await boot).localReady,false);
 assert.deepEqual([...s.map],before);assert.equal(s.ops.slice(ops).some(x=>x[0]!=='get'),false);m.dispose();
});

test('initially valid LS becoming invalid cannot use stale localUsable on native rejection or timeout',async()=>{
 for(const timeout of [false,true]){const s=storage([[SAVE_KEY,JSON.stringify(profile())]]),p=backend(),hold=defer();p.hook(op=>op==='get'?hold.promise:undefined);const m=session(s,p),boot=m.boot({timeout:timeout?5:1000});await turn();
  s.setItem(SAVE_KEY,'now invalid');const ops=s.ops.length;if(!timeout)hold.reject(Error('native rejected'));const result=await boot;assert.equal(result.localReady,false);assert.equal(m.snapshot().ready,false);
  if(timeout)hold.resolve();await turn();assert.equal(s.map.get(SAVE_KEY),'now invalid');assert.equal(s.ops.slice(ops).some(x=>x[0]!=='get'),false);assert.equal(p.ops.some(x=>x[0]==='set'),false);m.dispose();
 }
});

test('late expired native query never overwrites externally accepted profile/CP; retry revalidates current generation',async()=>{
 const s=storage(),p=backend(),hold=defer();await seedRemote(p,[[SAVE_KEY,JSON.stringify(profile(900))]]);p.hook(op=>op==='get'?hold.promise:undefined);const m=session(s,p);
 assert.equal((await m.boot({timeout:5})).localReady,false);P.saveGame(profile(222),s);C.saveCheckpoint(cp('new',profile(222)),profile(222),s);const before=readFive(s),ops=s.ops.length;
 hold.resolve();await turn();await turn();assert.deepEqual(readFive(s),before);assert.equal(s.ops.slice(ops).some(x=>x[0]!=='get'),false);assert.equal(p.ops.some(x=>x[0]==='set'),false);
 p.hook(null);assert.equal((await m.boot()).localReady,true);assert.equal(C.loadCheckpoint(P.loadSave(s),s).run.id,'new');assert.equal(JSON.parse(s.map.get(SAVE_KEY)).coins,222);m.dispose();
});

test('facade readiness stays false until fresh profile accepted and accessor installed, while raw mirror readiness is explicit',async()=>{
 const s=storage(),p=backend(),m=session(s,p);s.fail((op,key)=>op==='set'&&key===SAVE_KEY);assert.equal(m.snapshot().ready,false);assert.equal((await m.boot()).state,'fresh-local-rejected');
 const failed=m.snapshot();assert.equal(failed.ready,false);assert.equal(failed.localReady,false);assert.equal(failed.installed,false);assert.equal(failed.mirrorReady,true);assert.equal(failed.mirrorLocalReady,true);
 s.fail(null);assert.equal((await m.boot()).localReady,true);assert.equal(m.snapshot().ready,true);m.dispose();assert.equal(m.snapshot().ready,false);
});

test('facade continuation rejects a new marker after mirror adopt, before either fresh write or accessor install',async()=>{
 for(const valid of [false,true]){const s=storage(valid?[[SAVE_KEY,JSON.stringify(profile(321))]]:[]),p=backend(),m=session(s,p),get=s.getItem;let markerReads=0;
  s.getItem=function(key){const value=get.call(this,key);if(key==='qa.integration.v1:restore'&&++markerReads===2)queueMicrotask(()=>s.setItem(key,'external marker after mirror adopt'));return value;};
  const result=await m.boot();assert.equal(result.localReady,false);assert.equal(m.snapshot().installed,false);assert.equal(m.snapshot().localReady,false);assert.equal(s.map.get('qa.integration.v1:restore'),'external marker after mirror adopt');assert.equal(s.ops.some(x=>x[0]==='set'&&x[1]!== 'qa.integration.v1:restore'),false);assert.equal(p.ops.some(x=>x[0]==='set'),false);m.dispose();
 }
});

test('facade continuation marker read failure never creates fresh data or installs a valid-LS port',async()=>{
 for(const valid of [false,true]){const s=storage(valid?[[SAVE_KEY,JSON.stringify(profile())]]:[]),p=backend(),m=session(s,p),get=s.getItem;let markerReads=0;
  s.getItem=function(key){if(key==='qa.integration.v1:restore'&&++markerReads>=3)throw Error('Marker read failed after mirror await');return get.call(this,key);};
  assert.equal((await m.boot()).localReady,false);assert.equal(m.snapshot().installed,false);assert.equal(s.ops.some(x=>x[0]==='set'),false);assert.equal(p.ops.some(x=>x[0]==='set'),false);m.dispose();
 }
});

test('synchronous final Game gate revalidates current profile, marker and accessor owner after arbitrary startup awaits',async()=>{
 const s=storage([[SAVE_KEY,JSON.stringify(profile())]]),p=backend(),m=session(s,p);await m.boot();assert.equal(typeof m.verifyLocalReady,'function');assert.equal(m.verifyLocalReady().localReady,true);const releaseOther=installStorage({});assert.equal(m.verifyLocalReady().localReady,false);releaseOther();assert.equal(m.verifyLocalReady().localReady,true);
 const original=readFive(s),ops=s.ops.length;await turn();s.setItem('qa.integration.v1:restore','new');assert.equal(m.verifyLocalReady().localReady,false);assert.equal(m.snapshot().ready,false);s.removeItem('qa.integration.v1:restore');assert.equal(m.verifyLocalReady().localReady,true);
 s.setItem(SAVE_KEY,'invalid current');assert.equal(m.verifyLocalReady().localReady,false);s.setItem(SAVE_KEY,original[0][1]);assert.equal(m.verifyLocalReady().localReady,true);assert.equal(s.ops.slice(ops).filter(x=>x[0]==='set'&&x[1]===SAVE_KEY).length,2);m.dispose();assert.equal(m.verifyLocalReady().localReady,false);
});
