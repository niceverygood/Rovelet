import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../src/game.js';
import {createNativeSaveTitle} from '../src/native-runtime.js';
import {createNativePersistenceSession} from '../src/native-persistence.js';
import {freshSave,SAVE_KEY,buildingCost} from '../src/data.js';
import {RUN_KEY} from '../src/checkpoint.js';
import {layoutFor} from '../src/village-layout.js';
import {villageStats} from '../src/village-stats.js';
import * as THREE from 'three';

const FIVE=[SAVE_KEY,SAVE_KEY+':backup',SAVE_KEY+':pending',RUN_KEY,RUN_KEY+':backup'];
const hash=async text=>createHash('sha256').update(text).digest('hex');
const flush=async()=>{for(let i=0;i<25;i++)await Promise.resolve();};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function storage(){const map=new Map(),writes=[];let quota=false;return {map,writes,quota:v=>quota=v,getItem:k=>map.get(k)??null,setItem(k,v){if(quota&&k===SAVE_KEY)throw Error('Declared profile quota');map.set(k,String(v));writes.push(['set',k]);},removeItem(k){map.delete(k);writes.push(['remove',k]);}};}
function backend(){const map=new Map(),calls=[];let rejected=false,hold=null;return {map,calls,reject:v=>rejected=v,holdNext(){hold=deferred();return hold;},async get({key}){return {value:map.get(key)??null};},async set({key,value}){calls.push({key,value});if(rejected)throw Error('Declared native rejection');const gate=hold;hold=null;if(gate)await gate.promise;map.set(key,value);}};}
function fixture(t){
 const saved=Object.fromEntries(['window','document','localStorage'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)])),s=storage();
 const profile=freshSave();profile.settings.sound=false;s.map.set(SAVE_KEY,JSON.stringify(profile));
 globalThis.window={addEventListener(){}};globalThis.document={documentElement:{lang:'ko'},title:'',hidden:false,addEventListener(){},querySelector:()=>null};globalThis.localStorage=s;
 const w={actors:new THREE.Group(),home:{visible:true},cameraTarget:new THREE.Vector3(),residents:{people:[]},views:0,clones:0,updateBuildings(){this.views++;},setHome(v){this.home.visible=v;},clearActors(){this.actors.clear();},castle(){this.clones++;const root=new THREE.Group();root.userData.model=new THREE.Group();root.add(root.userData.model);this.actors.add(root);return root;},cancelPreview(){},villageDecorObstacles:()=>[]};
 const g=new Game(w,{storage:s,native:true}),ui={inputReady:true,renderScreen(){},syncInteraction(){},toast(){}};g.ui=ui;g.nativeInputBlocked=false;
 let wall=100000,mono=1000;Object.assign(g.construction,{wallNow:()=>wall,monotonicNow:()=>mono,nextProbe:0,clocks:{}});g.construction.syncClocks();g.mode='village';
 assert.equal(g.construction.start('greenhouse',layoutFor(g.save).greenhouse).ok,true);
 g.mode='run';g.screen='pause';g.world.home.visible=false;g.run={id:'native-construction-held',stageId:'meadow-1',duration:360,time:39.5,stage:1,level:2,hp:200,maxHp:220,coins:7,kills:3,xp:0,weapons:{cannon:1},cooldowns:{},villageStats:villageStats(g.save),outcome:null,choices:[],boostCd:0,boostTime:0,shieldCd:0,shieldTime:0,repairCd:0,invuln:0,slowTime:0,settled:false};
 let cpCount=0;const original=g.checkpointRun;g.checkpointRun=function(...args){cpCount++;return original.apply(this,args);};
 t.after(()=>{for(const [k,d]of Object.entries(saved))if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];});
 return {s,g,w,ui,cpCount:()=>cpCount,advance(){wall+=10000;mono+=10000;},five:()=>FIVE.map(k=>[k,s.getItem(k)])};
}
async function session(t,f){const p=backend(),s=createNativePersistenceSession({storage:f.s,backend:p,sha256:hash,scope:'qa.held.construction',timeoutMs:40});assert.equal((await s.boot()).localReady,true);f.g.storage=s.port;f.g.construction.storage=s.port;t.after(()=>s.dispose());return {p,s,c:createNativeSaveTitle({game:f.g,ui:f.ui,session:s})};}
function completion(f){const run=structuredClone(f.g.run),clones=f.w.clones,views=f.w.views;f.advance();assert.equal(f.g.construction.flush(true),true);assert.equal(f.g.save.buildings.greenhouse,1);assert.equal(f.g.save.construction,undefined);assert.equal(f.g.save.coins,140-buildingCost('greenhouse',0));assert.deepEqual(f.g.run,run);assert.equal(f.w.clones,clones);assert.equal(f.w.views,views);return run;}
function latestEntries(p){return [...p.map.values()].map(JSON.parse).sort((a,b)=>b.revision-a.revision)[0]?.entries;}

test('actual failed held ticket cannot exit after actual ConstructionRuntime completion; cancel and one new CP can recover',async t=>{
 const f=fixture(t),{p,c}=await session(t,f);p.reject(true);assert.equal((await c.request()).nativeAck,false);assert.equal(f.cpCount(),1);const old=c.snapshot().barrier,cp=f.s.getItem(RUN_KEY),run=completion(f),afterCompletion=f.five();
 p.reject(false);const stale=await c.request();assert.equal(stale.state,'stale-critical-target');assert.equal(stale.nativeAck,false);assert.equal(c.snapshot().barrier,old);assert.equal(c.snapshot().held,true);assert.equal(f.g.mode,'run');assert.equal(f.g.screen,'pause');assert.equal(f.cpCount(),1);assert.equal(f.s.getItem(RUN_KEY),cp);assert.deepEqual(f.five(),afterCompletion);assert.equal((await c.flushBackground()).state,'stale-critical-target');assert.equal(f.cpCount(),1);
 assert.equal(c.cancel(),true);assert.equal(f.g.screen,'pause');assert.equal(f.s.getItem(RUN_KEY),cp);const first=await c.request();assert.equal(f.cpCount(),2);if(!first.nativeAck){assert.equal(first.state,'timeout');const fresh=c.snapshot().barrier;assert.notEqual(fresh,old);assert.equal((await c.request()).nativeAck,true);assert.equal(f.cpCount(),2);}
 assert.equal(f.g.mode,'title');assert.equal(f.g.screen,'title');assert.deepEqual(f.g.run,run);assert.deepEqual(latestEntries(p),f.five());assert.equal(f.g.save.runs,0);assert.equal(f.g.save.buildings.greenhouse,1);assert.equal(f.g.save.coins,140-buildingCost('greenhouse',0));
});

test('actual completion while Preferences write is in-flight makes late ack stale without replaying CP or settlement',async t=>{
 const f=fixture(t),{p,c}=await session(t,f),gate=p.holdNext(),flight=c.request();await flush();assert.equal(f.cpCount(),1);assert.equal(c.snapshot().busy,true);const cp=f.s.getItem(RUN_KEY),run=completion(f);gate.resolve();const result=await flight;assert.equal(result.nativeAck,false);assert.equal(result.state,'stale-critical-target');assert.equal(f.g.screen,'pause');assert.equal(f.g.mode,'run');assert.equal(f.cpCount(),1);assert.equal(f.s.getItem(RUN_KEY),cp);assert.deepEqual(f.g.run,run);assert.equal(c.cancel(),true);assert.equal((await c.request()).nativeAck,true);assert.equal(f.cpCount(),2);assert.equal(f.g.mode,'title');assert.equal(f.g.save.runs,0);assert.deepEqual(latestEntries(p),f.five());
});

test('actual quota-rejected completion preserves logical profile/run but backup mutation correctly blocks the old ticket',async t=>{
 const f=fixture(t),{p,c}=await session(t,f);p.reject(true);assert.equal((await c.request()).nativeAck,false);const old=c.snapshot().barrier,save=structuredClone(f.g.save),run=structuredClone(f.g.run),cp=f.s.getItem(RUN_KEY),before=f.five();f.advance();f.s.quota(true);assert.equal(f.g.construction.flush(true),false);assert.equal(f.g.construction.waiting,'persist-failed');assert.deepEqual(f.g.save,save);assert.deepEqual(f.g.run,run);assert.equal(f.s.getItem(RUN_KEY),cp);assert.notDeepEqual(f.five(),before,'Legacy saveGame writes backup before rejected primary; full snapshot really changed');p.reject(false);const result=await c.request();assert.equal(result.nativeAck,false);assert.equal(result.state,'stale-critical-target');assert.equal(c.snapshot().barrier,old);assert.equal(f.cpCount(),1);assert.equal(f.g.mode,'run');assert.equal(f.g.screen,'pause');assert.equal(c.cancel(),true);assert.equal(f.s.getItem(RUN_KEY),cp);f.s.quota(false);assert.equal(f.g.construction.flush(true),true);assert.equal(f.g.save.buildings.greenhouse,1);assert.equal(f.g.save.coins,save.coins);assert.equal(f.g.save.runs,0);assert.deepEqual(f.g.run,run);
});
