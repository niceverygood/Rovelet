import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {createRequire} from 'node:module';
import {Game} from '../src/game.js';import {freshSave} from '../src/data.js';import {villageStats} from '../src/village-stats.js';import {loadCheckpoint,normalizeCheckpoint,RUN_KEY} from '../src/checkpoint.js';import BALANCE from '../src/balance.json' with {type:'json'};
const {diagnoseCheckpoint}=createRequire(import.meta.url)('../scripts/campaign-audit.cjs');
function fixture(time){
 const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)},save=freshSave(),root=new THREE.Group();save.buildings={garage:2,smithy:2,greenhouse:1};root.position.set(1.25,0,-4.5);root.rotation.y=.4;
 const run={id:'checkpoint-time-'+String(time),stageId:'volcano-2',duration:660,time,stage:2,level:3,hp:173.25,maxHp:325,coins:78.5,kills:23,xp:5,villageStats:villageStats(save),weapons:{cannon:2,crystal:1},cooldowns:{cannon:.4},outcome:null,choices:[]};
 const g=Object.create(Game.prototype);Object.assign(g,{mode:'run',screen:'',save,run,player:{root},enemies:[],loot:[],ui:{toast(){}}});return {g,map,storage};
}
function resumed(save,checkpoint){const g=Object.create(Game.prototype);Object.assign(g,{mode:'title',screen:'title',save:structuredClone(save),run:null,checkpoint,advanced:{reset(){}},bossSystem:{reset(){}},world:{clearActors(){},setHome(){},setRegion(){},castle:()=>new THREE.Group(),ring:()=>new THREE.Group()},ui:{toast(){}},rebuildAttachments(){},show(screen){this.screen=screen;}});return g;}
function withStorage(f,check){const old=globalThis.localStorage;globalThis.localStorage=f.storage;try{check(f);}finally{globalThis.localStorage=old;}}

for(const time of [7200.000000036455,7201,10800,1e7-.25])test('actual checkpoint save/load/resume preserves a long active run at '+time,()=>withStorage(fixture(time),({g,map})=>{
 const before=structuredClone(g.run),saveBefore=structuredClone(g.save);assert.equal(g.checkpointRun(),true);assert.ok(map.has(RUN_KEY));const loaded=loadCheckpoint(g.save);assert.ok(loaded);assert.equal(diagnoseCheckpoint(loaded,g.save,BALANCE).valid,true);
 // A later town state must not replace the run's frozen departure statistics.
 const owner=resumed({...g.save,buildings:{garage:6,smithy:6,greenhouse:6}},loaded);assert.equal(owner.resumeRun(),true);
 for(const key of ['id','time','hp','maxHp','coins','kills','stageId'])assert.equal(owner.run[key],before[key]);assert.deepEqual(owner.run.villageStats,before.villageStats);assert.deepEqual(owner.run.weapons,before.weapons);assert.deepEqual(owner.player.root.position.toArray(),g.player.root.position.toArray());assert.equal(owner.player.root.rotation.y,g.player.root.rotation.y);assert.equal(owner.run.outcome,null);assert.equal(owner.mode,'run');assert.equal(owner.screen,'');assert.deepEqual(g.save,saveBefore);assert.equal(owner.save.runs,0);assert.equal(owner.save.victories,0);assert.equal(owner.save.coins,140);
}));
test('old checkpoint times remain unchanged through the actual save/load path',()=>{
 for(const time of [0,35.25,7199.99,7200])withStorage(fixture(time),({g})=>{assert.equal(g.checkpointRun(),true);assert.equal(loadCheckpoint(g.save).run.time,time);});
});
test('nonfinite, negative and settlement-limit times are still rejected without writing a checkpoint',()=>{
 for(const time of [NaN,Infinity,-Infinity,-.001,1e7,1e7+1])withStorage(fixture(time),({g,map})=>{assert.equal(g.checkpointRun(),false);assert.equal(map.size,0);assert.equal(loadCheckpoint(g.save),null);assert.ok(Object.is(g.run.time,time));const c={version:1,run:g.run,position:g.player.root.position.toArray(),rotation:.4,enemies:[]};assert.equal(diagnoseCheckpoint(c,g.save,BALANCE).valid,false);});
});
test('long-duration support does not relax HP, position, weapon or enemy checkpoint validation',()=>withStorage(fixture(10800),({g})=>{
 assert.equal(g.checkpointRun(),true);const good=loadCheckpoint(g.save);for(const corrupt of [c=>c.run.hp=0,c=>c.position[0]=101,c=>c.run.weapons={unknown:1},c=>c.enemies=[{kind:'cannon',hp:10,maxHp:10,attack:-1e7-1,position:[0,0,0]}]]){const c=structuredClone(good);corrupt(c);assert.equal(normalizeCheckpoint(c,g.save),null);}
}));
