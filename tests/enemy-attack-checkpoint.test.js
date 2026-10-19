import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {Game} from '../src/game.js';import {EnemyNavigation} from '../src/enemy-navigation.js';import {freshSave} from '../src/data.js';import {villageStats} from '../src/village-stats.js';import {loadCheckpoint,normalizeCheckpoint,RUN_KEY} from '../src/checkpoint.js';import BALANCE from '../src/balance.json' with {type:'json'};
function actor(){
 const root=new THREE.Group(),model=new THREE.Group(),yaw=new THREE.Group(),pitch=new THREE.Group(),slide=new THREE.Group(),muzzle=new THREE.Group();
 yaw.name='gun-yaw';pitch.name='gun-pitch';slide.name='gun-slide';muzzle.name='gun-muzzle';yaw.userData.arc=Math.PI;root.add(model);model.add(yaw);yaw.add(pitch);pitch.add(slide);slide.add(muzzle);root.userData.model=model;root.userData.healthHeight=2;root.baseCannon=yaw;return root;
}
function setup(kind='cannon',attack=1.5){
 const g=Object.create(Game.prototype),save=freshSave(),player=actor(),root=actor(),messages=[],map=new Map();save.settings.sound=false;root.position.z=70;root.rotation.y=Math.PI;
 const storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)};
 const run={id:'attack-checkpoint-'+kind,stageId:'meadow-1',duration:360,villageStats:villageStats(save),time:0,coins:0,kills:0,level:1,xp:0,stage:1,hp:220,maxHp:220,weapons:{cannon:1},cooldowns:{cannon:1000},spawnTimer:1000,eliteTimer:1000,boostCd:0,boostTime:0,shieldCd:0,shieldTime:0,repairCd:0,invuln:0,slowTime:0,slowFactor:1,midSpawned:false,midDefeated:false,bossSpawned:false,outcome:null,choices:[]};
 const enemy={id:'far-enemy',root,kind,hp:65,maxHp:65,attack,charge:0,hit:0};
 Object.assign(g,{mode:'run',screen:'',save,run,clock:0,keys:new Set(),player:{root:player,stage:1},enemies:[enemy],bullets:[],loot:[],telegraphs:[],navigation:new EnemyNavigation(),selection:{position:new THREE.Vector3(),scale:new THREE.Vector3(),material:{color:new THREE.Color(),opacity:.4}},ui:{toast:message=>messages.push(message)},bossSystem:{update(){},updateBoss(){}},updateWeaponAiming(){},updateBullets(){},updateLoot(){}});
 g.world={obstacles:[],regions:{surface:()=>({grip:1})},resolveCollision(){},projectile:()=>new THREE.Group(),muzzleBlast(){},feedback:{shot(){}},ring:()=>new THREE.Mesh(new THREE.RingGeometry(1,1.1,8),new THREE.MeshBasicMaterial({transparent:true})),remove:object=>object.removeFromParent()};
 g.spawnEnemy=g.spawnBoss=()=>{throw Error('Fixture should not spawn unrelated actors');};g.takeDamage=()=>{throw Error('Enemy should remain outside contact range');};
 return {g,enemy,storage,map,messages};
}
function withStorage(fixture,check){const previous=globalThis.localStorage;globalThis.localStorage=fixture.storage;try{check(fixture);}finally{globalThis.localStorage=previous;}}

for(const kind of ['cannon','charger'])test(kind+' remains checkpointable after 35 seconds outside firing range',()=>withStorage(setup(kind),({g,enemy,map,messages})=>{
 for(let i=0;i<35*30;i++){g.updateRun(1/30);assert.ok(enemy.root.position.distanceTo(g.player.root.position)>20);assert.ok(enemy.attack>=0);}
 assert.equal(enemy.attack,0);assert.equal(enemy.windup??0,0);assert.equal(g.bullets.length,0);assert.equal(messages.length,0);assert.ok(map.has(RUN_KEY));assert.equal(g.checkpointRun(),true);
 const loaded=loadCheckpoint(g.save);assert.ok(loaded);assert.equal(loaded.enemies[0].attack,0);assert.equal(loaded.run.time,g.run.time);assert.deepEqual(loaded.enemies[0].position,enemy.root.position.toArray());
}));

test('a ready cannon fires on returning to range and retains its normal attack interval',()=>withStorage(setup('cannon',0),({g,enemy})=>{
 for(let i=0;i<35*30;i++)g.updateRun(1/30);enemy.root.position.set(0,0,10);
 for(let i=0;i<12&&!g.bullets.length;i++)g.updateRun(1/30);
 assert.equal(g.bullets.length,1);assert.equal(g.bullets[0].owner,'enemy');assert.equal(g.bullets[0].key,'cannon');assert.equal(enemy.attack,BALANCE.enemies.attackInterval);assert.equal(g.checkpointRun(),true);assert.ok(loadCheckpoint(g.save));
}));

test('a ready charger still starts its warning then charge when returning to range',()=>withStorage(setup('charger',0),({g,enemy})=>{
 for(let i=0;i<35*30;i++)g.updateRun(1/30);enemy.root.position.set(0,0,10);g.updateRun(1/30);
 assert.equal(enemy.attack,BALANCE.enemies.chargerInterval);assert.equal(enemy.windup,.55);assert.equal(g.telegraphs.length,1);assert.equal(g.bullets.length,0);
 for(let i=0;i<20&&enemy.windup>0;i++)g.updateRun(1/30);
 assert.equal(enemy.windup,0);assert.ok(enemy.charge>0);assert.equal(g.bullets.length,0);assert.equal(g.checkpointRun(),true);
}));

test('legacy timers normalize to readiness while current engine saturation and corruption bounds remain',()=>withStorage(setup('cannon',-5),({g,enemy})=>{
 assert.equal(g.checkpointRun(),true);assert.equal(loadCheckpoint(g.save).enemies[0].attack,0);g.updateRun(1/30);assert.equal(enemy.attack,0);assert.equal(g.checkpointRun(),true);
 const loaded=loadCheckpoint(g.save);assert.equal(loaded.enemies[0].attack,0);loaded.enemies[0].attack=-11;assert.equal(normalizeCheckpoint(loaded,g.save).enemies[0].attack,0);loaded.enemies[0].attack=-1e7-1;assert.equal(normalizeCheckpoint(loaded,g.save),null);
}));
