import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../src/game.js';
import {World} from '../src/world.js';
import {freshSave,SAVE_KEY,xpNeeded} from '../src/data.js';
import {stepDrive} from '../src/drive.js';
import {terrainHeight,stepContact} from '../src/terrain-motion.js';
import {updateWheels,wheelTravel} from '../src/wheels.js';
import {loadCheckpoint,RUN_KEY} from '../src/checkpoint.js';
import {getLanguage,setLanguage} from '../src/i18n.js';
import BALANCE from '../src/balance.json' with {type:'json'};

const dt=1/60,near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-10,`${message}: ${actual} != ${expected}`);
const wrap=a=>THREE.MathUtils.euclideanModulo(a+Math.PI,Math.PI*2)-Math.PI;

// Synthetic geometry/DOM/storage only; Game ctor/start/levelUp/choices/choose,
// updateRun/rebuildAttachments/boost/checkpoint/resume and World.castle/contact
// remain actual. An empty combat arena and explicit progression thresholds are
// unit scenarios, not earned growth, campaign, Meshy rendering or difficulty QA.
function asset(id,height=1){
 const model=new THREE.Group(),yaw=new THREE.Group(),pitch=new THREE.Group(),slide=new THREE.Group(),muzzle=new THREE.Object3D();
 yaw.name='gun-yaw';yaw.userData.arc=Math.PI;pitch.name='gun-pitch';slide.name='gun-slide';muzzle.name='gun-muzzle';
 model.add(yaw);yaw.add(pitch);pitch.add(slide);slide.add(muzzle);
 const large=id==='castle-large',radius=large?.28:.22,count=large?6:4;
 for(let i=0;i<count;i++){
  const pivot=new THREE.Group(),rotor=new THREE.Group();pivot.name='wheel-steer-'+i;rotor.name='wheel-roll';
  pivot.position.set((i%2?1:-1)*.3,radius,(Math.floor(i/2)-(count/2-1)/2)*.55);
  pivot.userData={wheel:true,front:i>=count-2,axis:id==='castle-medium'?'z':'x',radius};pivot.add(rotor);model.add(pivot);
 }
 model.scale.setScalar(height/2.6);return model;
}
function fixture(t){
 const previous={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage,language:getLanguage()},map=new Map(),messages=[],disposed=[],puffs=[],kicks=[];
 const save=freshSave();save.settings.sound=false;map.set(SAVE_KEY,JSON.stringify(save));
 globalThis.window={addEventListener(){}};
 globalThis.document={documentElement:{lang:'ko'},title:'',addEventListener(){}};
 globalThis.localStorage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)};
 t.after(()=>{globalThis.window=previous.window;globalThis.document=previous.document;globalThis.localStorage=previous.localStorage;setLanguage(previous.language);});
 const world={actors:new THREE.Group(),effects:new THREE.Group(),cameraTarget:new THREE.Vector3(),obstacles:[],
  regions:{surface:()=>({grip:1}),tintEnemy(){}},asset,updateBuildings(){},setHome(){},setRegion(){},
  clearActors(){this.actors.clear();this.effects.clear();},disposeRuntime:root=>disposed.push(root),heightAt:terrainHeight,resolveCollision(){},
  ring:()=>new THREE.Mesh(new THREE.RingGeometry(1,1.1,8),new THREE.MeshBasicMaterial({transparent:true})),
  puff:(...args)=>puffs.push(args),feedback:{cameraKick:(...args)=>kicks.push(args)},remove:object=>object.removeFromParent(),
 };
 world.castle=stage=>World.prototype.castle.call(world,stage);world.enemy=kind=>World.prototype.enemy.call(world,kind);
 const g=new Game(world);g.ui={renderScreen(){},toast:message=>messages.push(message)};g.start();
 // Actual start spawns three actors; remove only those combat participants.
 for(const enemy of g.enemies)enemy.root.removeFromParent();g.enemies=[];g.run.spawnTimer=999;g.run.eliteTimer=999;
 const root=g.player.root;root.position.set(23,terrainHeight(23,14),14);
 for(let i=0;i<180;i++)World.prototype.poseContact.call(world,root,dt,'run',false);
 updateWheels(root);puffs.length=0;kicks.length=0;
 return {g,world,map,messages,disposed,puffs,kicks};
}
function drive(f,keys,ticks=35){
 f.g.keys=new Set(keys);
 for(let i=0;i<ticks;i++){f.g.updateRun(dt);World.prototype.poseContact.call(f.world,f.g.player.root,dt,'run',false);updateWheels(f.g.player.root,f.g.player.root.userData.drive.steering);}
}
function offerGrowth(f){
 // Explicit unit progression setup; actual updateRun generates the offered grow.
 f.g.run.level=f.g.run.stage===1?3:7;f.g.run.xp=xpNeeded(f.g.run.level);
 f.g.updateRun(dt);assert.equal(f.g.screen,'upgrade');const index=f.g.run.choices.findIndex(c=>c.type==='grow');assert.ok(index>=0);
 return index;
}
function before(f){const root=f.g.player.root;return {root,position:root.position.clone(),rotation:root.rotation.clone(),drive:structuredClone(root.userData.drive),contact:structuredClone(root.userData.contact),run:structuredClone(f.g.run),save:structuredClone(f.g.save),storage:Object.fromEntries(f.map)};}
function grown(f,index){const snapshot=before(f);f.g.choose(index);return snapshot;}
function expectNext(f,snapshot,{throttle=0,steer=0}={}){
 const root=f.g.player.root,r=f.g.run,expected=stepDrive(snapshot.drive,{throttle,steer,stage:r.stage,boost:Math.max(0,r.boostTime-dt)>0,bonus:(r.speedBonus??0)+(r.villageStats?.speedBonus??0),speedScale:r.slowTime>dt?(r.slowFactor??1):1,grip:1},dt),position=root.position.clone();
 f.g.updateRun(dt);
 for(const [key,value]of Object.entries(expected))near(root.userData.drive[key],value,'next '+key);
 near(root.position.x,position.x+expected.dx,'next x');near(root.position.z,position.z+expected.dz,'next z');near(root.rotation.y,expected.heading,'next yaw');
 return expected;
}

test('actual grow preserves moving drive/contact and full terrain pose as independent value state',t=>{
 const f=fixture(t);drive(f,['KeyW','KeyD']);const index=offerGrowth(f);f.g.keys.add('KeyW');const old=grown(f,index),root=f.g.player.root;
 assert.notEqual(root,old.root);assert.equal(old.root.parent,null);assert.equal(root.parent,f.world.actors);assert.ok(f.disposed.includes(old.root));
 assert.ok(old.drive.speed>0);assert.notEqual(old.drive.steering,0);assert.ok(old.drive.distance>0);assert.ok(Math.abs(old.rotation.x)+Math.abs(old.rotation.z)>0);
 assert.deepEqual(root.position.toArray(),old.position.toArray());assert.deepEqual(root.rotation.toArray(),old.rotation.toArray());
 assert.deepEqual(root.userData.drive,old.drive);assert.notEqual(root.userData.drive,old.root.userData.drive);
 assert.deepEqual(root.userData.contact,old.contact);assert.notEqual(root.userData.contact,old.root.userData.contact);
 assert.equal(f.g.keys.size,0,'Closing the choice still clears held keyboard input.');assert.equal(f.g.screen,'');assert.equal(f.g.run.stage,2);assert.equal(f.g.player.stage,2);
 const expectedRun={...old.run,stage:2,hp:old.run.hp+BALANCE.progression.growthHp,maxHp:old.run.maxHp+BALANCE.progression.growthHp};
 assert.deepEqual(f.g.run,expectedRun);assert.deepEqual(f.g.save,old.save);assert.deepEqual(Object.fromEntries(f.map),old.storage);
});

test('growth resumes natural coasting and then fresh forward steering with the new stage policy',t=>{
 const f=fixture(t);drive(f,['KeyW','KeyA']);const index=offerGrowth(f),old=grown(f,index),expected=expectNext(f,old);
 assert.ok(expected.speed>0&&expected.speed<old.drive.speed);assert.ok(expected.distance>old.drive.distance);
 const next={drive:structuredClone(f.g.player.root.userData.drive)};f.g.keys=new Set(['KeyW','KeyD']);expectNext(f,next,{throttle:1,steer:1});
});

test('reverse growth retains signed momentum and respects the existing smaller reverse cap',t=>{
 const f=fixture(t);drive(f,['KeyS','KeyA'],70);const index=offerGrowth(f),old=grown(f,index);
 assert.ok(old.drive.speed< -1.5,'Reach stage1 reverse cap before growth.');
 f.g.keys=new Set(['KeyS','KeyA']);const expected=expectNext(f,old,{throttle:-1,steer:-1});
 near(expected.speed,-1.7/1.32,'Existing stage2 reverse cap is intentional');assert.ok(expected.speed<0);
});

test('boosted growth retains speed while boost timers and new mass continue normally',t=>{
 const f=fixture(t);drive(f,['KeyW'],75);f.g.boost();drive(f,['KeyW','KeyD'],25);const index=offerGrowth(f),old=grown(f,index);
 assert.ok(old.drive.speed>4.2);assert.ok(old.run.boostTime>dt);assert.equal(f.g.run.boostTime,old.run.boostTime);assert.equal(f.g.run.boostCd,old.run.boostCd);
 f.g.keys=new Set(['KeyW','KeyD']);const expected=expectNext(f,old,{throttle:1,steer:1});assert.ok(expected.speed>4.2);
 near(f.g.run.boostTime,old.run.boostTime-dt,'boost remaining');near(f.g.run.boostCd,old.run.boostCd-dt,'boost cooldown');
});

test('grounded growth continues contact without creating another artificial landing',t=>{
 const f=fixture(t);drive(f,[],1);const index=offerGrowth(f),old=grown(f,index),root=f.g.player.root,ground=terrainHeight(root.position.x,root.position.z),expected=stepContact(old.contact,ground,dt,false);
 const puffs=f.puffs.length,kicks=f.kicks.length;World.prototype.poseContact.call(f.world,root,dt,'run',false);
 near(root.position.y,expected.height,'contact height');for(const key of ['velocity','compression','springVelocity'])near(root.userData.contact[key],expected[key],'contact '+key);
 assert.equal(root.userData.contact.impact,0);assert.equal(f.puffs.length,puffs);assert.equal(f.kicks.length,kicks);
});

test('second growth uses six new wheel pivots and actual signed travel, never old cached rotors',t=>{
 const f=fixture(t);drive(f,['KeyW','KeyD']);f.g.choose(offerGrowth(f));drive(f,['KeyW','KeyA']);
 const old=grown(f,offerGrowth(f)),root=f.g.player.root,oldWheelState=old.root.userData.wheelMotion,oldAngles=oldWheelState.wheels.map(w=>w.rotor.rotation.toArray());
 assert.equal(oldWheelState.wheels.length,4);assert.equal(f.g.run.stage,3);assert.notEqual(root.userData.wheelMotion,oldWheelState);
 const state=updateWheels(root,root.userData.drive?.steering??0);assert.equal(state.wheels.length,6);
 for(const w of state.wheels){assert.ok(root.getObjectById(w.pivot.id));assert.ok(root.getObjectById(w.rotor.id));assert.ok(!old.root.getObjectById(w.rotor.id));}
 const start=root.position.clone(),heading=root.rotation.y;f.g.keys=new Set(['KeyW','KeyD']);const expected=expectNext(f,old,{throttle:1,steer:1});updateWheels(root,root.userData.drive.steering);
 for(const w of state.wheels){const turn=w.pivot.userData.front?-expected.steering:0,travel=wheelTravel(root.position.x-start.x,root.position.z-start.z,expected.heading-heading,w.offset.x,w.offset.z,heading+(expected.heading-heading)*.5,turn);near(w.angle,wrap(travel/w.radius),'new wheel travel/radius');}
 assert.deepEqual(oldWheelState.wheels.map(w=>w.rotor.rotation.toArray()),oldAngles);
});

test('growth without prior drive/contact retains the existing lazy initialization contract',t=>{
 const f=fixture(t),root=f.g.player.root;delete root.userData.drive;delete root.userData.contact;
 f.g.run.level=4;f.g.run.choices=f.g.choices();f.g.show('upgrade');f.g.choose(f.g.run.choices.findIndex(c=>c.type==='grow'));
 assert.equal(f.g.player.root.userData.drive,undefined);assert.equal(f.g.player.root.userData.contact,undefined);
 f.g.keys=new Set(['KeyW']);f.g.updateRun(dt);assert.ok(f.g.player.root.userData.drive.speed>0);
});

test('actual post-growth checkpoint round-trip preserves existing fields without serializing model caches',t=>{
 const f=fixture(t);drive(f,['KeyW','KeyD']);f.g.boost();f.g.choose(offerGrowth(f));const root=f.g.player.root,run=structuredClone(f.g.run),save=structuredClone(f.g.save),primary=f.map.get(SAVE_KEY);
 assert.equal(f.g.checkpointRun(),true);const checkpoint=loadCheckpoint(f.g.save);assert.ok(checkpoint);assert.equal(checkpoint.run.stage,2);
 assert.deepEqual(checkpoint.position,root.position.toArray());assert.equal(checkpoint.rotation,root.rotation.y);assert.deepEqual(checkpoint.run,run);
 const raw=JSON.parse(f.map.get(RUN_KEY));for(const key of ['drive','contact','wheelMotion','userData'])assert.equal(Object.hasOwn(raw,key),false);
 const restored=new Game(f.world);restored.ui={renderScreen(){},toast(){}};assert.equal(restored.resumeRun(),true);
 for(const key of ['id','stage','hp','maxHp','time','coins','kills','boostTime','boostCd'])assert.equal(restored.run[key],run[key]);
 for(const key of ['weapons','cooldowns','villageStats'])assert.deepEqual(restored.run[key],run[key]);
 assert.equal(restored.run.invuln,3,'Existing resume protection remains intact.');assert.equal(restored.player.stage,2);assert.deepEqual(restored.player.root.position.toArray(),checkpoint.position);assert.equal(restored.player.root.rotation.y,checkpoint.rotation);
 assert.equal(restored.player.root.userData.drive,undefined,'Checkpoint schema still resumes with no saved momentum.');assert.deepEqual(restored.save,save);assert.equal(f.map.get(SAVE_KEY),primary);
});
