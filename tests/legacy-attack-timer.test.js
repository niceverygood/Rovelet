import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {Game} from '../src/game.js';
import {SAVE_KEY} from '../src/data.js';
import {RUN_KEY,normalizeCheckpoint,loadCheckpoint,saveCheckpoint} from '../src/checkpoint.js';

function nativeFixture(t){
 const globals=new Map(['window','document','localStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 t.after(()=>{for(const[key,descriptor]of globals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
 const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)};
 globalThis.window={addEventListener(){}};globalThis.document={documentElement:{lang:'ko'},title:'',addEventListener(){}};globalThis.localStorage=storage;
 function newGame(){
  const world={actors:new THREE.Group(),cameraTarget:new THREE.Vector3(),updateBuildings(){},clearActors(){this.actors.clear();},setHome(){},setRegion(){},ring:()=>new THREE.Group()};
  const actor=()=>{const root=new THREE.Group();root.userData.model=new THREE.Group();root.userData.healthHeight=2;root.add(root.userData.model);world.actors.add(root);return root;};world.castle=actor;world.enemy=actor;world.boss=actor;
  const game=new Game(world);game.ui={renderScreen(){},toast(){}};game.rebuildAttachments=()=>{};return game;
 }
 // Actual game-generated mandatory fields, three ordinary enemies and a real
 // stage-specific boss. Only renderer/audio substitutes are installed.
 const game=newGame();game.save.settings.sound=false;assert.equal(game.persist(),true);game.start();game.spawnBoss('mid');assert.equal(game.checkpointRun(),true);
 const checkpoint=JSON.parse(map.get(RUN_KEY));assert.ok(normalizeCheckpoint(checkpoint,game.save));assert.equal(checkpoint.enemies.length,4);assert.equal(checkpoint.enemies.filter(enemy=>enemy.bossId).length,1);
 const legacy=attack=>{const value=structuredClone(checkpoint);for(const enemy of value.enemies)enemy.attack=attack;return value;};
 return {game,map,storage,checkpoint,legacy,newGame};
}
function assertOnlyAttackChanged(clean,original,expectedAttack){
 assert.ok(clean,'A valid legacy checkpoint must remain resumable.');
 assert.equal(clean.enemies.length,original.enemies.length);
 assert.deepEqual(clean.run,original.run);assert.deepEqual(clean.position,original.position);assert.equal(clean.rotation,original.rotation);
 assert.deepEqual(clean.enemies,original.enemies.map(enemy=>({...enemy,attack:expectedAttack})), 'Only the overdue attack timer may change; kind/HP/position/boss fields must survive.');
 assert.deepEqual(clean.loot,original.loot);assert.equal(clean.screen,original.screen);
}

test('finite legacy attack timers down to the settlement bound normalize to zero without mutating source data',t=>{
 const f=nativeFixture(t);
 for(const attack of [-12.4384,-7200,-9999999,-1e7]){const legacy=f.legacy(attack),before=structuredClone(legacy),clean=normalizeCheckpoint(legacy,f.game.save);assertOnlyAttackChanged(clean,legacy,0);assert.deepEqual(legacy,before);}
});

test('actual checkpoint load accepts a legacy negative primary while leaving its stored bytes untouched',t=>{
 const f=nativeFixture(t),legacy=f.legacy(-12.4384),raw=JSON.stringify(legacy);f.storage.setItem(RUN_KEY,raw);f.storage.removeItem(RUN_KEY+':backup');
 const loaded=loadCheckpoint(f.game.save,f.storage);assertOnlyAttackChanged(loaded,legacy,0);assert.equal(f.map.get(RUN_KEY),raw);assert.equal(f.map.has(RUN_KEY+':backup'),false);
});

test('actual checkpoint save writes normalized legacy attack timers and preserves the input checkpoint',t=>{
 const f=nativeFixture(t),legacy=f.legacy(-7200),before=structuredClone(legacy);
 assert.equal(saveCheckpoint(legacy,f.game.save,f.storage),true);assert.deepEqual(legacy,before);
 const persisted=JSON.parse(f.map.get(RUN_KEY));assertOnlyAttackChanged(persisted,legacy,0);assertOnlyAttackChanged(loadCheckpoint(f.game.save,f.storage),legacy,0);
});

test('actual Game constructor and resume restore ordinary enemies and boss metadata from a legacy checkpoint',t=>{
 const f=nativeFixture(t),legacy=f.legacy(-9999999),raw=JSON.stringify(legacy),saveBefore=structuredClone(f.game.save);f.storage.setItem(RUN_KEY,raw);f.storage.removeItem(RUN_KEY+':backup');
 const restored=f.newGame();assert.ok(restored.checkpoint);assertOnlyAttackChanged(restored.checkpoint,legacy,0);assert.equal(restored.resumeRun(),true);
 assert.deepEqual(restored.save,saveBefore);assert.deepEqual(restored.run,legacy.run);assert.deepEqual(restored.player.root.position.toArray(),legacy.position);assert.equal(restored.player.root.rotation.y,legacy.rotation);
 assert.equal(restored.mode,'run');assert.equal(restored.screen,'');assert.equal(restored.enemies.length,legacy.enemies.length);
 for(let index=0;index<legacy.enemies.length;index++){const expected=legacy.enemies[index],actual=restored.enemies[index];assert.equal(actual.kind,expected.kind);assert.equal(actual.hp,expected.hp);assert.equal(actual.maxHp,expected.maxHp);assert.deepEqual(actual.root.position.toArray(),expected.position);assert.equal(actual.attack,0);assert.equal(actual.boss?.profile.id,expected.bossId);if(expected.bossId)assert.equal(actual.boss.index,expected.bossIndex);}
 assert.equal(f.map.get(RUN_KEY),raw,'Resuming does not silently rewrite the source save.');assert.deepEqual(legacy,f.legacy(-9999999));
});

test('a corrupt primary falls back to the valid negative-timer backup without modifying either stored slot',t=>{
 const f=nativeFixture(t),legacy=f.legacy(-7200),backup=JSON.stringify(legacy);f.storage.setItem(RUN_KEY,'broken-json');f.storage.setItem(RUN_KEY+':backup',backup);
 const loaded=loadCheckpoint(f.game.save,f.storage);assertOnlyAttackChanged(loaded,legacy,0);assert.equal(f.map.get(RUN_KEY),'broken-json');assert.equal(f.map.get(RUN_KEY+':backup'),backup);
});

test('current nonnegative attack timers remain exact at zero, fractional values and the1000 upper bound',t=>{
 const f=nativeFixture(t);
 for(const attack of [0,.25,999,1000]){const current=f.legacy(attack),before=structuredClone(current),clean=normalizeCheckpoint(current,f.game.save);assertOnlyAttackChanged(clean,current,attack);assert.deepEqual(current,before);assert.equal(saveCheckpoint(current,f.game.save,f.storage),true);assertOnlyAttackChanged(loadCheckpoint(f.game.save,f.storage),current,attack);}
});

test('nonfinite and out-of-range enemy attack timers remain rejected without any checkpoint writes',t=>{
 const f=nativeFixture(t),storageBefore=new Map(f.map);
 for(const attack of [NaN,Infinity,-Infinity,-1e7-.01,1000.001]){const invalid=f.legacy(attack),before=structuredClone(invalid);assert.equal(normalizeCheckpoint(invalid,f.game.save),null);assert.equal(saveCheckpoint(invalid,f.game.save,f.storage),false);assert.deepEqual(invalid,before);assert.deepEqual(f.map,storageBefore);}
});

test('legacy timer migration does not relax enemy identity, HP, positions, weapons or settled-run checks',t=>{
 const f=nativeFixture(t);
 for(const corrupt of [value=>value.enemies[0].kind='invalid',value=>value.enemies[0].hp=0,value=>value.enemies[0].maxHp=.001,value=>value.enemies[0].position[0]=101,value=>value.run.weapons.cannon=99,value=>value.position[2]=-101]){const invalid=f.legacy(-7200);corrupt(invalid);assert.equal(normalizeCheckpoint(invalid,f.game.save),null);}
 const settledSave={...f.game.save,settledRuns:[f.checkpoint.run.id]};assert.equal(normalizeCheckpoint(f.legacy(-7200),settledSave),null);
});

test('actual0.1.0 writer fixture survives current constructor, resume and checkpoint save without rewriting its town profile',t=>{
 const directory=new URL('../verification/legacy-checkpoint/2026-10-17T12-11-41-855Z-7d6cf733/',import.meta.url),names=['profile.json','checkpoint.json','storage.json','generation.json'],bytes=Object.fromEntries(names.map(name=>[name,readFileSync(new URL(name,directory))])),profile=JSON.parse(bytes['profile.json']),legacy=JSON.parse(bytes['checkpoint.json']),stored=JSON.parse(bytes['storage.json']),generation=JSON.parse(bytes['generation.json']),legacyBefore=structuredClone(legacy);
 assert.equal(generation.historicalVersion,'0.1.0');assert.equal(generation.historicalRevision,'7d6cf733a745c5760d254bc2e95d512bea1a278a');assert.deepEqual(JSON.parse(stored[SAVE_KEY]),profile);assert.deepEqual(JSON.parse(stored[RUN_KEY]),legacy);
 assert.equal(profile.schemaVersion,undefined);assert.equal(profile.campaign,undefined);assert.equal(legacy.run.stageId,undefined);assert.equal(legacy.run.villageStats,undefined);assert.equal(legacy.run.time,15.999999999999954);assert.equal(legacy.run.hp,220);assert.ok(legacy.enemies.some(enemy=>enemy.attack===-14.171288772951774));
 const globals=new Map(['window','document','localStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));t.after(()=>{for(const[key,descriptor]of globals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
 const map=new Map(Object.entries(stored)),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)};
 globalThis.window={addEventListener(){}};globalThis.document={documentElement:{lang:'ko'},title:'',addEventListener(){}};globalThis.localStorage=storage;
 const world={actors:new THREE.Group(),cameraTarget:new THREE.Vector3(),updateBuildings(){},clearActors(){this.actors.clear();},setHome(){},setRegion(){},ring:()=>new THREE.Group()},actor=()=>{const root=new THREE.Group();root.userData.model=new THREE.Group();root.userData.healthHeight=2;root.add(root.userData.model);world.actors.add(root);return root;};world.castle=actor;world.enemy=actor;world.boss=actor;
 const game=new Game(world);game.ui={renderScreen(){},toast(){}};game.rebuildAttachments=()=>{};
 assert.equal(game.save.schemaVersion,2);assert.equal(game.save.coins,profile.coins);assert.equal(game.save.runs,profile.runs);assert.equal(game.save.totalKills,profile.totalKills);assert.deepEqual(game.save.buildings,profile.buildings);assert.deepEqual(game.save.settledRuns,profile.settledRuns);assert.equal(game.save.campaign.selected,'meadow-1');assert.equal(game.save.campaign.unlocked,1);assert.deepEqual(game.save.campaign.completed,[]);assert.equal(game.save.settings.language,'ko');assert.equal(game.save.settings.bgmVolume,.45);assert.equal(game.save.settings.sfxVolume,1);assert.equal(game.save.settings.vibration,false);
 assert.ok(game.checkpoint,'The actual old writer payload must remain available to Continue.');const canonical=game.checkpoint;assert.equal(canonical.run.id,legacy.run.id);assert.equal(canonical.run.time,legacy.run.time);assert.equal(canonical.run.hp,legacy.run.hp);assert.equal(canonical.run.maxHp,legacy.run.maxHp);assert.equal(canonical.run.stageId,'meadow-1');assert.equal(canonical.run.duration,360);assert.equal(canonical.run.villageStats.maxHp,220);assert.equal(canonical.run.invuln,0);assert.equal(canonical.run.slowTime,0);assert.deepEqual(canonical.run.weapons,legacy.run.weapons);assert.deepEqual(canonical.enemies,legacy.enemies.map(enemy=>({...enemy,attack:Math.max(0,enemy.attack)})));assert.deepEqual(Object.fromEntries(map),stored,'Constructor migration must not overwrite stored profile/checkpoint bytes.');
 assert.equal(game.resumeRun(),true);assert.equal(game.run.id,legacy.run.id);assert.equal(game.run.time,legacy.run.time);assert.equal(game.run.hp,legacy.run.hp);assert.equal(game.run.maxHp,legacy.run.maxHp);assert.equal(game.run.invuln,3);assert.deepEqual(game.player.root.position.toArray(),legacy.position);assert.equal(game.player.root.rotation.y,legacy.rotation);assert.equal(game.enemies.length,legacy.enemies.length);
 for(let index=0;index<legacy.enemies.length;index++){const expected=legacy.enemies[index],actual=game.enemies[index];assert.equal(actual.kind,expected.kind);assert.equal(actual.hp,expected.hp);assert.equal(actual.maxHp,expected.maxHp);assert.deepEqual(actual.root.position.toArray(),expected.position);assert.equal(actual.attack,Math.max(0,expected.attack));}
 assert.deepEqual(Object.fromEntries(map),stored,'Resume must not persist a changed town profile.');assert.equal(game.checkpointRun(),true);const reloaded=loadCheckpoint(game.save,storage);assert.equal(reloaded.run.id,legacy.run.id);assert.equal(reloaded.run.time,legacy.run.time);assert.equal(reloaded.run.hp,legacy.run.hp);assert.equal(reloaded.run.invuln,3);assert.deepEqual(reloaded.enemies,canonical.enemies);assert.deepEqual(reloaded.position,legacy.position);assert.equal(reloaded.rotation,legacy.rotation);
 const nonRunEntries=entries=>Object.fromEntries(Object.entries(entries).filter(([key])=>key!==RUN_KEY&&key!==RUN_KEY+':backup'));assert.deepEqual(nonRunEntries(Object.fromEntries(map)),nonRunEntries(stored),'Only RUN primary/backup writes are expected.');assert.deepEqual(legacy,legacyBefore);for(const name of names)assert.deepEqual(readFileSync(new URL(name,directory)),bytes[name],'Historical fixture file changed: '+name);
});
