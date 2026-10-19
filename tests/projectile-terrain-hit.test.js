import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../src/game.js';
import {freshSave,WEAPONS} from '../src/data.js';
import {terrainHeight} from '../src/terrain-motion.js';

const dt=1/60;
function fixture({x=23,z=14,owner='player',key='cannon',offset=0,height=1,gravity=0,verticalSpeed=0,kind='cannon',bossRole}={}){
 const game=Object.create(Game.prototype),save=freshSave(),root=new THREE.Group(),enemyRoot=new THREE.Group(),ground=terrainHeight(x,z),impacts=[],numbers=[],removed=[];
 save.settings.sound=false;save.settings.reducedMotion=true;
 root.position.set(x,ground,z);enemyRoot.position.copy(root.position);enemyRoot.userData.healthHeight=2;
 const enemy={id:'terrain-target',kind,bossRole,hp:1000,maxHp:1000,root:enemyRoot},mesh=new THREE.Group(),velocity=new THREE.Vector3(0,verticalSpeed,1);
 mesh.position.set(x+offset,ground+height-verticalSpeed*dt+.5*gravity*dt*dt,z-dt);
 const bullet={owner,key,mesh,velocity,gravity,damage:17,life:2,hit:new Set()};
 Object.assign(game,{save,clock:10,hitStop:0,player:{root},enemies:[enemy],bullets:[bullet],advanced:{update(){}},run:{outcome:null,stage:1,hp:220,invuln:0,shieldTime:0,kills:0,coins:0},world:{
  heightAt:terrainHeight,remove(model){removed.push(model);},puff(){},feedback:{stats:{playerHits:0},impact(point,direction,options){impacts.push({point:point.toArray(),direction:direction.toArray(),options});},impulse(){},damageNumber(point,amount,player){numbers.push({point:point.toArray(),amount,player});},cameraKick(){},ring(){},add(){}},
 },combatSound(){},ui:{flash(){}}});
 return {game,enemy,bullet,ground,impacts,numbers,removed};
}

for(const owner of ['player','enemy'])for(const position of [{label:'flat ground',x:0,z:0},{label:'raised ground',x:23,z:14}]){
 test(`actual ${owner} projectile hits its target on ${position.label}`,()=>{
  const f=fixture({...position,owner});if(position.x)assert.ok(f.ground>1,'Fixture must expose the old mixed-axis distance error.');
  f.game.updateBullets(dt);
  assert.equal(owner==='player'?f.enemy.hp:f.game.run.hp,owner==='player'?983:203);
  assert.equal(f.impacts.length,1);assert.equal(f.numbers.length,1);assert.equal(f.numbers[0].amount,17);
  assert.deepEqual(f.impacts[0].point,f.bullet.mesh.position.toArray());
  assert.equal(f.game.bullets.length,0);assert.deepEqual(f.removed,[f.bullet.mesh]);assert.equal(f.game.run.outcome,null);
 });
 test(`actual ${owner} projectile still misses outside its horizontal radius on ${position.label}`,()=>{
  const f=fixture({...position,owner,offset:1.1});f.game.updateBullets(dt);
  assert.equal(f.enemy.hp,1000);assert.equal(f.game.run.hp,220);assert.equal(f.impacts.length,0);assert.equal(f.game.bullets.length,1);
 });
 test(`actual ${owner} projectile above the castle still misses on ${position.label}`,()=>{
  const f=fixture({...position,owner,height:4});f.game.updateBullets(dt);
  assert.equal(f.enemy.hp,1000);assert.equal(f.game.run.hp,220);assert.equal(f.impacts.length,0);assert.equal(f.game.bullets.length,1);
 });
}

test('ascending mortar does not hit a raised target before descending',()=>{
 const f=fixture({key:'mortar',gravity:9,verticalSpeed:3});f.game.updateBullets(dt);
 assert.ok(f.bullet.velocity.y>0);assert.equal(f.enemy.hp,1000);assert.equal(f.impacts.length,0);assert.equal(f.game.bullets.length,1);
});

test('descending mortar retains its direct and nearby splash damage on raised ground',()=>{
 const f=fixture({key:'mortar',gravity:9,verticalSpeed:-3}),nearby={id:'splash-target',kind:'cannon',hp:1000,root:new THREE.Group()};
 nearby.root.position.copy(f.enemy.root.position).add(new THREE.Vector3(.5,0,0));nearby.root.userData.healthHeight=2;f.game.enemies.push(nearby);
 f.game.updateBullets(dt);
 assert.equal(f.enemy.hp,983);assert.equal(nearby.hp,1000-17*WEAPONS.mortar.splashMultiplier);assert.equal(f.impacts.length,2);assert.equal(f.game.bullets.length,0);
});

test('ballista remains alive after its raised-ground hit and cannot hit the same target twice',()=>{
 const f=fixture({key:'ballista'});f.game.updateBullets(dt);f.game.updateBullets(dt);
 assert.equal(f.enemy.hp,983);assert.equal(f.impacts.length,1);assert.equal(f.game.bullets.length,1);assert.deepEqual([...f.bullet.hit],['terrain-target']);
});

test('boss horizontal hit radius remains larger than the ordinary enemy radius',()=>{
 for(const [kind,bossRole,expected] of [['cannon',undefined,1000],['boss','final',983]]){
  const f=fixture({kind,bossRole,offset:1.8});f.game.updateBullets(dt);assert.equal(f.enemy.hp,expected);
 }
});

test('enemy projectile still respects player invulnerability on raised ground',()=>{
 const f=fixture({owner:'enemy'});f.game.run.invuln=1;f.game.updateBullets(dt);
 assert.equal(f.game.run.hp,220);assert.equal(f.impacts.length,0);assert.equal(f.game.bullets.length,0);
});

test('settled raised-ground shots cannot move, damage or emit impact feedback',()=>{
 const f=fixture();f.game.run.outcome='victory';const before=f.bullet.mesh.position.toArray();f.game.updateBullets(dt);
 assert.deepEqual(f.bullet.mesh.position.toArray(),before);assert.equal(f.enemy.hp,1000);assert.equal(f.impacts.length,0);assert.equal(f.game.bullets.length,1);
});
